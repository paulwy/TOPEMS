"""TOPEMS 数据模型"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class ServiceStatus(Enum):
    """服务状态"""
    UNKNOWN = "unknown"
    RUNNING = "running"
    STOPPED = "stopped"
    STARTING = "starting"
    STOPPING = "stopping"
    ERROR = "error"


class DeploymentMode(Enum):
    """部署模式"""
    LOCAL = "local"
    DOCKER = "docker"
    SAAS = "saas"


@dataclass
class Service:
    """服务定义"""
    name: str
    port: int
    env_var: str
    description: str
    status: str = "implemented"
    dependencies: list[str] = field(default_factory=list)
    group: Optional[str] = None

    def __post_init__(self):
        if isinstance(self.dependencies, str):
            self.dependencies = [] if self.dependencies == "" else [self.dependencies]


@dataclass
class ServiceInstance:
    """运行中的服务实例"""
    name: str
    port: int
    pid: Optional[int] = None
    status: ServiceStatus = ServiceStatus.UNKNOWN
    health_check_url: str = "/health"
    uptime_seconds: int = 0
    last_health_check: Optional[str] = None

    @property
    def is_running(self) -> bool:
        return self.status == ServiceStatus.RUNNING


@dataclass
class HealthCheckResult:
    """健康检查结果"""
    service_name: str
    port: int
    is_healthy: bool
    response_time_ms: Optional[float] = None
    message: str = ""
    error: Optional[str] = None
