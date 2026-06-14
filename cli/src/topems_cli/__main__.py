"""TOPEMS CLI 入口点"""

import sys
from pathlib import Path

import click
from rich.console import Console

# 添加 src 目录到 Python 路径
src_path = Path(__file__).parent
sys.path.insert(0, str(src_path))

console = Console()


@click.group()
@click.version_option(version="1.0.0")
def main():
    """TOPEMS 服务管理命令行工具

    用于管理 TOPEMS 系统的各种服务，包括启动、停止、状态查看等功能。
    """
    pass


# 注册子命令
from .commands.start import start
from .commands.stop import stop
from .commands.status import status
from .commands.logs import logs
from .commands.test import test
from .commands.cleanup import cleanup
from .commands.build import build
from .commands.db import db

main.add_command(start, name="start")
main.add_command(stop, name="stop")
main.add_command(status, name="status")
main.add_command(logs, name="logs")
main.add_command(test, name="test")
main.add_command(cleanup, name="cleanup")
main.add_command(build, name="build")
main.add_command(db, name="db")

# Docker 命令只在 Docker 可用时注册
from .docker import get_docker_manager
_docker_mgr = get_docker_manager()
if _docker_mgr.is_docker_available():
    from .commands.docker import docker
    main.add_command(docker, name="docker")


if __name__ == "__main__":
    main()
