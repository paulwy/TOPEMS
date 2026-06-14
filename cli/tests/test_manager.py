"""测试服务管理器模块"""

import pytest
from unittest.mock import patch, MagicMock

from topems_cli.manager import ServiceManager, get_manager
from topems_cli.config import get_config
from topems_cli.models import ServiceStatus


class TestServiceManager:
    """服务管理器测试"""

    @pytest.fixture
    def manager(self):
        """创建服务管理器实例"""
        return ServiceManager()

    def test_manager_init(self, manager):
        """测试管理器初始化"""
        assert manager is not None
        assert hasattr(manager, 'get_service')
        assert hasattr(manager, 'get_all_services')
        assert hasattr(manager, 'check_service_status')

    def test_manager_get_service(self, manager):
        """测试获取服务"""
        service = manager.get_service("iam")
        assert service is not None
        assert service.name == "iam"

    def test_manager_get_all_services(self, manager):
        """测试获取所有服务"""
        services = manager.get_all_services()
        assert len(services) >= 27

    def test_manager_check_service_status(self, manager):
        """测试检查服务状态"""
        instance = manager.check_service_status("iam")
        assert instance is not None
        assert instance.name == "iam"

    def test_manager_get_running_services(self, manager):
        """测试获取运行中的服务"""
        running = manager.get_running_services()
        assert isinstance(running, list)

    def test_manager_get_manager(self):
        """测试获取全局管理器实例"""
        manager1 = get_manager()
        manager2 = get_manager()
        assert manager1 is manager2


class TestServiceInstance:
    """服务实例测试"""

    def test_service_status_enum(self):
        """测试服务状态枚举"""
        assert ServiceStatus.RUNNING is not None
        assert ServiceStatus.STOPPED is not None
        assert ServiceStatus.ERROR is not None


class TestManagerIntegration:
    """管理器集成测试"""

    def test_manager_checks_all_services(self):
        """测试检查所有服务"""
        manager = ServiceManager()
        instances = manager.check_all_services_status()
        assert len(instances) >= 27

    def test_manager_service_lookup(self):
        """测试服务查找"""
        manager = ServiceManager()
        
        # 查找存在的服务
        service = manager.get_service("iam")
        assert service is not None
        
        # 查找不存在的服务
        service = manager.get_service("nonexistent")
        assert service is None

    def test_manager_module_services(self):
        """测试模块服务"""
        manager = ServiceManager()
        config = get_config()
        
        # 获取核心模块服务
        core_services = config.get_module_services("core")
        assert len(core_services) > 0
        
        # 验证每个服务都可以被管理器获取
        for svc in core_services:
            instance = manager.get_service(svc.name)
            assert instance is not None
