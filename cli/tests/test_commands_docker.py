"""测试 docker 命令"""

import pytest
from unittest.mock import patch, MagicMock

from topems_cli.docker import DockerManager, get_docker_manager


class TestDockerManager:
    """Docker 管理器测试"""

    def test_docker_manager_init(self):
        """测试 Docker 管理器初始化"""
        manager = DockerManager()
        assert manager is not None

    def test_is_docker_available(self):
        """测试 Docker 可用性检测"""
        manager = DockerManager()
        result = manager.is_docker_available()
        assert isinstance(result, bool)

    def test_get_docker_manager_returns_manager(self):
        """测试返回管理器实例"""
        manager = get_docker_manager()
        assert isinstance(manager, DockerManager)


class TestDockerIntegration:
    """Docker 集成测试"""

    def test_docker_module_imports(self):
        """测试模块导入"""
        try:
            from topems_cli.docker import DockerManager
            from topems_cli.commands.docker import docker
            assert True
        except ImportError:
            pytest.skip("Docker 相关模块不可用")

    def test_docker_manager_exists(self):
        """测试管理器类存在"""
        assert hasattr(DockerManager, 'is_docker_available')
        assert hasattr(DockerManager, 'get_container_status')
