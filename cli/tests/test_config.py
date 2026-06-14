"""测试配置模块"""

import pytest
import os
from pathlib import Path
from unittest.mock import patch

from topems_cli.config import Config, get_config, reload_config
from topems_cli.models import Service


class TestConfig:
    """配置模块测试"""

    def test_config_init_with_path(self):
        """测试使用指定路径初始化"""
        config_path = str(Path(__file__).parent.parent.parent / "config" / "services.yaml")
        if Path(config_path).exists():
            config = Config(config_path)
            assert config is not None
            assert len(config.get_all_services()) > 0

    def test_config_get_service(self):
        """测试获取单个服务"""
        config = get_config()
        iam_service = config.get_service("iam")
        assert iam_service is not None
        assert iam_service.name == "iam"
        assert iam_service.port == 8000

    def test_config_get_service_not_found(self):
        """测试获取不存在的服务"""
        config = get_config()
        result = config.get_service("nonexistent")
        assert result is None

    def test_config_get_services_by_group(self):
        """测试按组获取服务"""
        config = get_config()
        core_services = config.get_services_by_group("core")
        assert len(core_services) > 0

    def test_config_get_module_services(self):
        """测试获取模块服务"""
        config = get_config()
        core_services = config.get_module_services("core")
        assert len(core_services) > 0

    def test_config_get_all_services(self):
        """测试获取所有服务"""
        config = get_config()
        all_services = config.get_all_services()
        assert len(all_services) >= 27  # 至少27个服务
        service_names = [s.name for s in all_services]
        assert "iam" in service_names
        assert "pm" in service_names
        assert "ai" in service_names

    def test_config_get_service_by_port(self):
        """测试通过端口获取服务"""
        config = get_config()
        service = config.get_service_by_port(8000)
        assert service is not None
        assert service.name == "iam"

    def test_config_get_all_modules(self):
        """测试获取所有模块"""
        config = get_config()
        modules = config.get_all_modules()
        assert "core" in modules
        assert "erp" in modules
        assert "plm" in modules
        assert "analytics" in modules

    def test_config_get_special_ports(self):
        """测试获取特殊端口"""
        config = get_config()
        special = config.get_special_ports()
        assert isinstance(special, dict)

    def test_service_attributes(self):
        """测试服务属性"""
        config = get_config()
        service = config.get_service("iam")
        assert service.name == "iam"
        assert service.port == 8000
        assert hasattr(service, 'env_var')
        assert hasattr(service, 'description')
        assert hasattr(service, 'status')
        assert hasattr(service, 'group')

    def test_config_port_allocation(self):
        """测试端口分配唯一性"""
        config = get_config()
        # 验证所有服务有唯一端口
        ports = [s.port for s in config.get_all_services()]
        assert len(ports) == len(set(ports)), "端口应该唯一"


class TestServiceModel:
    """服务模型测试"""

    def test_service_creation(self):
        """测试服务创建"""
        service = Service(
            name="test",
            port=9999,
            env_var="TEST_PORT",
            description="测试服务",
            group="test"
        )
        assert service.name == "test"
        assert service.port == 9999
        assert service.env_var == "TEST_PORT"
        assert service.description == "测试服务"
        assert service.group == "test"

    def test_service_defaults(self):
        """测试服务默认值"""
        service = Service(
            name="test",
            port=9999,
            env_var="TEST_PORT",
            description="测试服务",
        )
        assert service.status == "implemented"
        assert service.dependencies == []
        # group 可能是 None 或空字符串
        assert service.group is None or service.group == ""


class TestConfigReload:
    """配置重载测试"""

    def test_reload_config(self):
        """测试配置重载"""
        config_path = str(Path(__file__).parent.parent.parent / "config" / "services.yaml")
        if Path(config_path).exists():
            config = reload_config(config_path)
            assert config is not None
            assert len(config.get_all_services()) > 0
