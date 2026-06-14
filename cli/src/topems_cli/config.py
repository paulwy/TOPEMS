"""配置加载模块 - 从 YAML 文件加载服务配置"""

import os
from pathlib import Path
from typing import Dict, List, Optional

import yaml

from .models import Service


class Config:
    """配置管理类"""

    def __init__(self, config_path: Optional[str] = None):
        if config_path:
            self.config_path = Path(config_path)
        else:
            # 默认路径: 项目根目录/config/services.yaml
            self.config_path = self._find_config_path()

        self._config: Dict = {}
        self._services: Dict[str, Service] = {}
        self._load()

    def _find_config_path(self) -> Path:
        """查找配置文件路径"""
        # 从环境变量或默认位置查找
        if env_path := os.getenv("TOPEMS_CONFIG"):
            return Path(env_path)

        # 尝试多个可能的位置
        possible_paths = [
            Path(__file__).parent.parent.parent.parent / "config" / "services.yaml",
            Path.cwd() / "config" / "services.yaml",
            Path.home() / ".topems" / "services.yaml",
        ]

        for path in possible_paths:
            if path.exists():
                return path

        # 返回默认路径（即使不存在）
        return possible_paths[0]

    def _load(self) -> None:
        """加载配置文件"""
        if not self.config_path.exists():
            raise FileNotFoundError(f"配置文件不存在: {self.config_path}")

        with open(self.config_path, "r", encoding="utf-8") as f:
            self._config = yaml.safe_load(f)

        self._parse_services()

    def _parse_services(self) -> None:
        """解析服务定义"""
        service_groups = self._config.get("service_groups", {})

        for group_name, services in service_groups.items():
            for svc_data in services:
                service = Service(
                    name=svc_data["name"],
                    port=svc_data["port"],
                    env_var=svc_data["env_var"],
                    description=svc_data["description"],
                    status=svc_data.get("status", "implemented"),
                    dependencies=svc_data.get("dependencies", []),
                    group=group_name,
                )
                self._services[service.name] = service

    def get_service(self, name: str) -> Optional[Service]:
        """获取指定服务"""
        return self._services.get(name)

    def get_all_services(self) -> List[Service]:
        """获取所有服务"""
        return list(self._services.values())

    def get_services_by_group(self, group: str) -> List[Service]:
        """获取指定分组的所有服务"""
        return [s for s in self._services.values() if s.group == group]

    def get_module_services(self, module: str) -> List[Service]:
        """获取指定模块的所有服务"""
        module_groups = self._config.get("module_groups", {})
        service_names = module_groups.get(module, [])

        result = []
        for name in service_names:
            if service := self._services.get(name):
                result.append(service)
        return result

    def get_all_modules(self) -> List[str]:
        """获取所有模块名称"""
        return list(self._config.get("module_groups", {}).keys())

    def get_special_ports(self) -> Dict:
        """获取特殊端口配置"""
        return self._config.get("special_ports", {})

    def get_service_by_port(self, port: int) -> Optional[Service]:
        """根据端口获取服务"""
        for service in self._services.values():
            if service.port == port:
                return service
        return None


# 全局配置实例
_config: Optional[Config] = None


def get_config(config_path: Optional[str] = None) -> Config:
    """获取配置实例（单例）"""
    global _config
    if _config is None:
        _config = Config(config_path)
    return _config


def reload_config(config_path: Optional[str] = None) -> Config:
    """重新加载配置"""
    global _config
    _config = Config(config_path)
    return _config
