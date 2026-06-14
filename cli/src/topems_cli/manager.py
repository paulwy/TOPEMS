"""服务管理器模块"""

import os
import signal
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

from .config import Config, get_config
from .health import HealthCheckResult, check_health_async, check_port
from .models import Service, ServiceInstance, ServiceStatus


class ServiceManager:
    """服务管理器"""

    def __init__(self, config: Optional[Config] = None):
        self.config = config or get_config()
        self._instances: Dict[str, ServiceInstance] = {}
        self._processes: Dict[str, subprocess.Popen] = {}

    def get_service(self, name: str) -> Optional[Service]:
        """获取服务定义"""
        return self.config.get_service(name)

    def get_all_services(self) -> List[Service]:
        """获取所有服务定义"""
        return self.config.get_all_services()

    def get_running_services(self) -> List[str]:
        """获取运行中的服务列表"""
        return [
            name for name, instance in self._instances.items()
            if instance.is_running
        ]

    def check_service_status(self, service_name: str) -> ServiceInstance:
        """检查服务状态"""
        service = self.get_service(service_name)
        if not service:
            return ServiceInstance(
                name=service_name,
                port=0,
                status=ServiceStatus.ERROR,
            )

        is_healthy = check_port("localhost", service.port)

        instance = ServiceInstance(
            name=service_name,
            port=service.port,
            status=ServiceStatus.RUNNING if is_healthy else ServiceStatus.STOPPED,
            pid=self._processes.get(service_name) and self._processes[service_name].pid,
        )

        self._instances[service_name] = instance
        return instance

    async def check_service_health_async(self, service_name: str) -> HealthCheckResult:
        """异步检查服务健康状态"""
        service = self.get_service(service_name)
        if not service:
            return HealthCheckResult(
                service_name=service_name,
                port=0,
                is_healthy=False,
                error="服务不存在",
            )

        result = await check_health_async(
            service_name,
            "localhost",
            service.port,
            path="/health",
            timeout=5.0,
        )

        # 更新实例状态
        self._instances[service_name] = ServiceInstance(
            name=service_name,
            port=service.port,
            status=ServiceStatus.RUNNING if result.is_healthy else ServiceStatus.STOPPED,
            last_health_check=result.message,
        )

        return result

    def check_all_services_status(self) -> List[ServiceInstance]:
        """检查所有服务状态"""
        services = self.get_all_services()
        results = []

        for service in services:
            instance = self.check_service_status(service.name)
            results.append(instance)

        return results

    def start_service(self, service_name: str, wait: bool = True, timeout: int = 30) -> bool:
        """启动服务"""
        service = self.get_service(service_name)
        if not service:
            print(f"错误: 未知服务 {service_name}")
            return False

        # 检查是否已运行
        if check_port("localhost", service.port):
            print(f"服务 {service_name} 已在运行 (端口 {service.port})")
            return True

        # 查找服务目录
        service_dir = self._find_service_dir(service_name)
        if not service_dir:
            print(f"错误: 找不到服务 {service_name} 的目录")
            return False

        # 启动服务
        log_file = self._get_log_path(service_name)
        log_file.parent.mkdir(parents=True, exist_ok=True)

        try:
            with open(log_file, "w") as f:
                process = subprocess.Popen(
                    ["./svc.sh", "start"],
                    cwd=service_dir,
                    stdout=f,
                    stderr=subprocess.STDOUT,
                    preexec_fn=os.setsid,
                    env=os.environ.copy(),
                )

            self._processes[service_name] = process

            # 等待服务启动
            if wait:
                for _ in range(timeout):
                    if check_port("localhost", service.port):
                        print(f"✓ 服务 {service_name} 已启动 (端口 {service.port})")
                        return True
                    import time
                    time.sleep(1)

                print(f"警告: 服务 {service_name} 启动超时")
                return False

            return True

        except Exception as e:
            print(f"错误: 启动服务 {service_name} 失败: {e}")
            return False

    def stop_service(self, service_name: str, force: bool = False) -> bool:
        """停止服务"""
        if service_name not in self._processes:
            # 尝试通过端口查找进程
            service = self.get_service(service_name)
            if service and check_port("localhost", service.port):
                print(f"警告: 服务 {service_name} 在运行但未由我们管理")
                if not force:
                    print("使用 --force 强制停止")
                    return False

        if service_name in self._processes:
            process = self._processes[service_name]
            try:
                os.killpg(os.getpgid(process.pid), signal.SIGTERM if not force else signal.SIGKILL)
                process.wait(timeout=10 if not force else 5)
                del self._processes[service_name]
                print(f"✓ 服务 {service_name} 已停止")
                return True
            except Exception as e:
                print(f"错误: 停止服务 {service_name} 失败: {e}")
                return False

        print(f"服务 {service_name} 未运行")
        return True

    def start_module(self, module: str, wait: bool = True) -> Dict[str, bool]:
        """启动模块的所有服务"""
        services = self.config.get_module_services(module)
        results = {}

        for service in services:
            results[service.name] = self.start_service(service.name, wait=wait)

        return results

    def stop_all(self, force: bool = False) -> Dict[str, bool]:
        """停止所有服务"""
        results = {}
        for service_name in list(self._processes.keys()):
            results[service_name] = self.stop_service(service_name, force)
        return results

    def _find_service_dir(self, service_name: str) -> Optional[Path]:
        """查找服务目录"""
        possible_dirs = [
            Path.cwd() / "svc" / service_name,
            Path(__file__).parent.parent.parent.parent / "svc" / service_name,
            Path.home() / "TOPEMS" / "svc" / service_name,
        ]

        for d in possible_dirs:
            if d.exists() and (d / "svc.sh").exists():
                return d
        return None

    def _get_log_path(self, service_name: str) -> Path:
        """获取日志文件路径"""
        log_dir = Path.home() / ".topems" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        return log_dir / f"{service_name}.log"


# 全局实例
_manager: Optional[ServiceManager] = None


def get_manager() -> ServiceManager:
    """获取服务管理器实例"""
    global _manager
    if _manager is None:
        _manager = ServiceManager()
    return _manager
