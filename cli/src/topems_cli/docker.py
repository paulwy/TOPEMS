"""Docker 支持模块"""

import os
import platform
import subprocess
import sys
from pathlib import Path
from typing import List, Optional


class DockerManager:
    """Docker 容器管理器"""

    def __init__(self, project_root: Optional[str] = None):
        self._is_windows = platform.system() == "Windows"
        self.project_root = project_root or self._find_project_root()
        self.compose_file = f"{self.project_root}/docker-compose.yml"

    def _find_project_root(self) -> str:
        """查找项目根目录"""
        # 从当前文件位置向上查找项目根目录（与 manager.py 一致）
        return str(Path(__file__).parent.parent.parent.parent.parent)

    def _get_docker_command(self) -> str:
        """获取 docker 命令（Windows 上可能是 docker.exe）"""
        return "docker.exe" if self._is_windows else "docker"

    def _get_compose_command(self) -> str:
        """获取 docker-compose 命令"""
        if self._is_windows:
            # Windows Server 2019 可能使用 docker-compose.exe
            return "docker-compose.exe"
        return "docker-compose"

    def is_docker_available(self) -> bool:
        """检查 Docker 是否可用"""
        try:
            docker_cmd = self._get_docker_command()
            result = subprocess.run(
                [docker_cmd, "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            return result.returncode == 0
        except Exception:
            return False

    def is_compose_available(self) -> bool:
        """检查 Docker Compose 是否可用"""
        try:
            compose_cmd = self._get_compose_command()
            result = subprocess.run(
                [compose_cmd, "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            return result.returncode == 0
        except Exception:
            return False

    def get_docker_info(self) -> dict:
        """获取 Docker 信息"""
        try:
            docker_cmd = self._get_docker_command()
            result = subprocess.run(
                [docker_cmd, "info", "--format", "{{json .}}"],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode == 0:
                import json
                return json.loads(result.stdout)
            return {}
        except Exception as e:
            return {"error": str(e)}

    def get_running_containers(self) -> List[str]:
        """获取运行中的容器"""
        try:
            compose_cmd = self._get_compose_command()
            result = subprocess.run(
                [compose_cmd, "ps", "-q"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                return [line.strip() for line in result.stdout.strip().split("\n") if line.strip()]
            return []
        except Exception:
            return []

    def start_services(self, services: Optional[List[str]] = None, profile: Optional[str] = None) -> bool:
        """启动服务"""
        if not self.is_docker_available():
            print("错误: Docker 不可用")
            return False

        compose_cmd = self._get_compose_command()
        cmd = [compose_cmd, "up", "-d"]
        if services:
            cmd.extend(services)
        if profile:
            cmd.extend(["--profile", profile])

        try:
            # Windows 上需要设置 TTY 环境
            env = os.environ.copy()
            if self._is_windows:
                env.pop("TERM", None)

            result = subprocess.run(
                cmd,
                cwd=self.project_root,
                env=env,
                timeout=300,
            )
            return result.returncode == 0
        except Exception as e:
            print(f"错误: 启动服务失败: {e}")
            return False

    def stop_services(self, services: Optional[List[str]] = None) -> bool:
        """停止服务"""
        if not self.is_docker_available():
            print("错误: Docker 不可用")
            return False

        compose_cmd = self._get_compose_command()
        cmd = [compose_cmd, "down"]
        if services:
            cmd = [compose_cmd, "stop"] + services

        try:
            env = os.environ.copy()
            if self._is_windows:
                env.pop("TERM", None)

            result = subprocess.run(
                cmd,
                cwd=self.project_root,
                env=env,
                timeout=60,
            )
            return result.returncode == 0
        except Exception as e:
            print(f"错误: 停止服务失败: {e}")
            return False

    def get_container_status(self) -> dict:
        """获取容器状态"""
        try:
            compose_cmd = self._get_compose_command()
            result = subprocess.run(
                [compose_cmd, "ps", "--format", "json"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0 and result.stdout:
                containers = []
                for line in result.stdout.strip().split("\n"):
                    if line:
                        try:
                            import json
                            containers.append(json.loads(line))
                        except json.JSONDecodeError:
                            pass
                return {"containers": containers, "total": len(containers)}
            return {"containers": [], "total": 0}
        except Exception as e:
            return {"error": str(e), "containers": [], "total": 0}

    def load_images(self, image_tar: str) -> bool:
        """从 tar 文件加载镜像"""
        if not self.is_docker_available():
            print("错误: Docker 不可用")
            return False

        try:
            docker_cmd = self._get_docker_command()
            result = subprocess.run(
                [docker_cmd, "load", "-i", image_tar],
                timeout=600,
            )
            return result.returncode == 0
        except Exception as e:
            print(f"错误: 加载镜像失败: {e}")
            return False

    def get_logs(self, service: str, lines: int = 100) -> str:
        """获取服务日志"""
        try:
            compose_cmd = self._get_compose_command()
            result = subprocess.run(
                [compose_cmd, "logs", "--tail", str(lines), service],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=30,
            )
            return result.stdout + result.stderr
        except Exception as e:
            return f"错误: 获取日志失败: {e}"

    def get_platform_info(self) -> dict:
        """获取平台信息"""
        return {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "is_windows": self._is_windows,
            "docker_available": self.is_docker_available(),
            "compose_available": self.is_compose_available(),
        }


# 全局实例
_docker_manager: Optional[DockerManager] = None


def get_docker_manager() -> DockerManager:
    """获取 Docker 管理器实例"""
    global _docker_manager
    if _docker_manager is None:
        _docker_manager = DockerManager()
    return _docker_manager
