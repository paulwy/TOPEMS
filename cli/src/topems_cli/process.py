"""进程管理模块"""

import os
import signal
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

from .models import ServiceInstance, ServiceStatus


class ProcessManager:
    """进程管理器"""

    def __init__(self):
        self._processes: Dict[str, subprocess.Popen] = {}
        self._service_pids: Dict[str, int] = {}

    def start_service(self, service_name: str, port: int, wait: bool = True) -> bool:
        """启动服务"""
        # 查找服务可执行文件或启动脚本
        service_dir = self._find_service_dir(service_name)
        if not service_dir:
            return False

        log_file = self._get_log_path(service_name)

        try:
            with open(log_file, "w") as f:
                process = subprocess.Popen(
                    ["./svc.sh", "start"],
                    cwd=service_dir,
                    stdout=f,
                    stderr=subprocess.STDOUT,
                    preexec_fn=os.setsid,
                )

            self._processes[service_name] = process
            self._service_pids[service_name] = process.pid
            return True

        except Exception as e:
            print(f"启动服务 {service_name} 失败: {e}")
            return False

    def stop_service(self, service_name: str, force: bool = False) -> bool:
        """停止服务"""
        if service_name not in self._processes:
            return False

        process = self._processes[service_name]

        try:
            if force:
                os.killpg(os.getpgid(process.pid), signal.SIGKILL)
            else:
                os.killpg(os.getpgid(process.pid), signal.SIGTERM)

            process.wait(timeout=10)
            del self._processes[service_name]
            del self._service_pids[service_name]
            return True

        except Exception as e:
            print(f"停止服务 {service_name} 失败: {e}")
            return False

    def get_service_status(self, service_name: str) -> ServiceStatus:
        """获取服务状态"""
        if service_name not in self._processes:
            return ServiceStatus.STOPPED

        process = self._processes[service_name]
        if process.poll() is None:
            return ServiceStatus.RUNNING
        else:
            return ServiceStatus.STOPPED

    def get_running_services(self) -> List[str]:
        """获取运行中的服务列表"""
        return [
            name for name, status in [
                (name, self.get_service_status(name))
                for name in self._processes
            ]
            if status == ServiceStatus.RUNNING
        ]

    def _find_service_dir(self, service_name: str) -> Optional[Path]:
        """查找服务目录"""
        possible_dirs = [
            Path.cwd() / "svc" / service_name,
            Path(__file__).parent.parent.parent.parent / "svc" / service_name,
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
