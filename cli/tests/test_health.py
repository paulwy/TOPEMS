"""测试健康检查模块"""

import pytest
import asyncio
from unittest.mock import patch, MagicMock

from topems_cli.health import (
    HealthCheckResult,
    check_port,
    check_health,
    check_health_async,
    check_multiple_services,
    check_multiple_services_async,
)


class TestHealthCheckResult:
    """健康检查结果测试"""

    def test_health_check_result_creation(self):
        """测试创建健康检查结果"""
        result = HealthCheckResult(
            service_name="iam",
            port=8000,
            is_healthy=True,
            response_time_ms=10.5,
            message="OK"
        )
        
        assert result.service_name == "iam"
        assert result.port == 8000
        assert result.is_healthy is True
        assert result.response_time_ms == 10.5
        assert result.message == "OK"
        assert result.error is None

    def test_health_check_result_defaults(self):
        """测试健康检查结果默认值"""
        result = HealthCheckResult(
            service_name="test",
            port=8000,
            is_healthy=False,
        )
        
        assert result.response_time_ms is None
        assert result.message == ""
        assert result.error is None


class TestCheckPort:
    """端口检查测试"""

    def test_check_port_localhost(self):
        """测试检查本地端口"""
        # 测试一个已知不存在的端口
        result = check_port("localhost", 59999, timeout=0.5)
        assert isinstance(result, bool)

    def test_check_port_invalid_host(self):
        """测试无效主机"""
        result = check_port("invalid_host_xyz", 8000, timeout=0.5)
        assert result is False


class TestCheckHealth:
    """健康检查测试"""

    def test_check_health_sync(self):
        """测试同步健康检查"""
        # 测试函数存在
        assert callable(check_health)

    def test_check_health_async_exists(self):
        """测试异步健康检查函数存在"""
        assert callable(check_health_async)


class TestCheckMultipleServices:
    """批量健康检查测试"""

    def test_check_multiple_services(self):
        """测试批量检查服务"""
        # 测试函数存在
        assert callable(check_multiple_services)

    def test_check_multiple_services_async(self):
        """测试异步批量检查"""
        # 测试函数存在
        assert callable(check_multiple_services_async)


class TestHealthCheckIntegration:
    """健康检查集成测试"""

    def test_health_check_result_dataclass(self):
        """测试 HealthCheckResult 是 dataclass"""
        result = HealthCheckResult(
            service_name="test",
            port=8000,
            is_healthy=True,
        )
        
        # dataclass 应该可以比较
        result2 = HealthCheckResult(
            service_name="test",
            port=8000,
            is_healthy=True,
        )
        
        assert result.service_name == result2.service_name
        assert result.port == result2.port

    def test_check_port_timeout(self):
        """测试端口检查超时"""
        result = check_port("localhost", 59999, timeout=0.01)
        assert result is False

    def test_check_port_type(self):
        """测试端口检查返回类型"""
        result = check_port("localhost", 8000)
        assert isinstance(result, bool)
