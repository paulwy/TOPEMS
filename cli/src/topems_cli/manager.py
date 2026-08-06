"""服务管理器模块"""

import os
import signal
import subprocess
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .config import Config, get_config
from .health import HealthCheckResult, check_health_async, check_port
from .models import Service, ServiceInstance, ServiceStatus


class ServiceManager:
    """服务管理器"""

    def __init__(self, config: Optional[Config] = None):
        self.config = config or get_config()
        self._instances: Dict[str, ServiceInstance] = {}
        self._processes: Dict[str, subprocess.Popen] = {}

    def check_postgres_health(self) -> Tuple[bool, str]:
        """检查PostgreSQL数据库健康状态"""
        try:
            env = os.environ.copy()
            env["LC_ALL"] = "C"
            env["LANG"] = "C"
            result = subprocess.run(
                ["pg_isready", "-h", "localhost", "-p", "5432"],
                capture_output=True,
                text=True,
                timeout=5,
                env=env
            )
            if result.returncode == 0:
                return True, "PostgreSQL 运行正常"
            return False, f"PostgreSQL 未就绪: {result.stdout.strip()}"
        except subprocess.TimeoutExpired:
            return False, "PostgreSQL 连接超时"
        except FileNotFoundError:
            return False, "pg_isready 命令未找到"
        except Exception as e:
            return False, f"检查 PostgreSQL 失败: {str(e)}"

    def _find_postgres_pid_file(self) -> Optional[Path]:
        """查找PostgreSQL的pid文件位置"""
        possible_paths = [
            Path("/opt/homebrew/var/postgresql@18/postmaster.pid"),
            Path("/usr/local/var/postgres/postmaster.pid"),
            Path(Path.home(), ".postgres/postmaster.pid"),
            Path("/var/lib/postgresql/18/main/postmaster.pid"),
        ]
        for path in possible_paths:
            if path.exists():
                return path
        return None

    def _validate_postgres_pid(self, pid_file: Path) -> bool:
        """验证pid文件中的进程是否存在"""
        try:
            with open(pid_file, 'r') as f:
                pid_str = f.readline().strip()
                if not pid_str.isdigit():
                    return False
                pid = int(pid_str)
            
            # 检查进程是否存在
            try:
                os.kill(pid, 0)
                # 获取进程名
                result = subprocess.run(
                    ["ps", "-p", str(pid), "-o", "comm="],
                    capture_output=True,
                    text=True
                )
                return "postgres" in result.stdout.lower()
            except OSError:
                return False
        except Exception:
            return False

    def fix_postgres_stuck(self) -> Tuple[bool, str]:
        """自动修复PostgreSQL卡住的问题（残留pid文件）"""
        pid_file = self._find_postgres_pid_file()
        if not pid_file:
            return False, "未找到PostgreSQL pid文件"

        if self._validate_postgres_pid(pid_file):
            return False, "PostgreSQL进程正在运行，无需修复"

        try:
            os.remove(pid_file)
            return True, f"已删除残留的pid文件: {pid_file}"
        except Exception as e:
            return False, f"删除pid文件失败: {str(e)}"

    def start_postgres(self) -> Tuple[bool, str]:
        """启动PostgreSQL服务"""
        try:
            result = subprocess.run(
                ["brew", "services", "start", "postgresql@18"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                return True, "PostgreSQL 启动成功"
            return False, f"启动失败: {result.stderr.strip()}"
        except FileNotFoundError:
            return False, "brew 命令未找到"
        except Exception as e:
            return False, f"启动 PostgreSQL 失败: {str(e)}"

    def ensure_postgres_ready(self, max_retries: int = 3, wait_seconds: int = 10) -> Tuple[bool, str]:
        """确保PostgreSQL就绪，必要时进行修复"""
        # 先检查健康状态
        healthy, message = self.check_postgres_health()
        if healthy:
            return True, message

        print(f"警告: {message}")

        # 尝试修复
        for attempt in range(max_retries):
            print(f"尝试修复 PostgreSQL ({attempt + 1}/{max_retries})...")
            
            # 1. 检查并修复pid文件问题
            fixed, fix_message = self.fix_postgres_stuck()
            if fixed:
                print(f"已修复: {fix_message}")
            
            # 2. 启动PostgreSQL
            started, start_message = self.start_postgres()
            print(f"{start_message}")
            
            # 3. 等待并检查
            time.sleep(wait_seconds)
            healthy, message = self.check_postgres_health()
            if healthy:
                return True, f"PostgreSQL 已恢复: {message}"
            
            print(f"修复尝试 {attempt + 1} 失败，继续重试...")

        return False, f"无法启动 PostgreSQL，尝试了 {max_retries} 次"

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
        service_dir = self._find_service_dir(service)
        if not service_dir:
            print(f"错误: 找不到服务 {service_name} 的目录")
            return False

        # 启动服务
        log_file = self._get_log_path(service_name)
        log_file.parent.mkdir(parents=True, exist_ok=True)

        try:
            env = os.environ.copy()
            env[service.env_var] = str(service.port)
            env["SERVER_PORT"] = str(service.port)
            env["PORT"] = str(service.port)
            # 与 db.py 保持一致：优先使用环境变量，回退到默认值
            env.setdefault("DATABASE_URL", os.getenv(
                "DATABASE_URL",
                f"postgres://{os.getenv('POSTGRES_USER', 'topems')}:"
                f"{os.getenv('POSTGRES_PASSWORD', 'topems_secret')}@"
                f"{os.getenv('POSTGRES_HOST', 'localhost')}:"
                f"{os.getenv('POSTGRES_PORT', '5432')}/"
                f"{os.getenv('POSTGRES_DB', 'topems')}",
            ))
            
            with open(log_file, "w") as f:
                process = subprocess.Popen(
                    ["cargo", "run"],
                    cwd=service_dir,
                    stdout=f,
                    stderr=subprocess.STDOUT,
                    preexec_fn=os.setsid,
                    env=env,
                )

            self._processes[service_name] = process

            # 等待服务启动
            if wait:
                for _ in range(timeout):
                    if check_port("localhost", service.port):
                        print(f"✓ 服务 {service_name} 已启动 (端口 {service.port})")
                        return True
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

    def _find_frontend_dir(self) -> Optional[Path]:
        """查找前端目录"""
        possible_dirs = [
            Path.cwd() / "apps" / "web",
            Path(__file__).parent.parent.parent.parent / "apps" / "web",
            Path.home() / "TOPEMS" / "apps" / "web",
        ]
        for d in possible_dirs:
            if d.exists() and (d / "package.json").exists():
                return d
        return None

    def start_frontend(self, timeout: int = 120) -> bool:
        """启动前端服务（pnpm dev），轮询等待端口就绪"""
        frontend_port = 3000

        # 已在运行
        if check_port("localhost", frontend_port):
            print(f"前端已在运行 (端口 {frontend_port})")
            return True

        frontend_dir = self._find_frontend_dir()
        if not frontend_dir:
            print("错误: 找不到前端目录 (apps/web)")
            return False

        log_file = self._get_log_path("frontend")
        log_file.parent.mkdir(parents=True, exist_ok=True)

        try:
            env = os.environ.copy()
            with open(log_file, "w") as f:
                process = subprocess.Popen(
                    ["pnpm", "dev"],
                    cwd=frontend_dir,
                    stdout=f,
                    stderr=subprocess.STDOUT,
                    preexec_fn=os.setsid,
                    env=env,
                )

            self._processes["frontend"] = process

            # 轮询等待端口就绪
            start_time = time.time()
            while time.time() - start_time < timeout:
                if check_port("localhost", frontend_port):
                    elapsed = int(time.time() - start_time)
                    print(f"✓ 前端已启动 (端口 {frontend_port}, 用时 {elapsed}s)")
                    return True

                # 进程已退出
                if process.poll() is not None:
                    print(f"错误: 前端进程已退出 (code={process.returncode})")
                    return False

                time.sleep(3)

            # 超时但进程仍活着
            if process.poll() is None:
                print(f"⚠ 前端仍在启动中 (PID: {process.pid})，通常需要 30~90 秒")
                print(f"  查看日志: {log_file}")
                return True

            print("错误: 前端启动超时")
            return False

        except Exception as e:
            print(f"错误: 启动前端失败: {e}")
            return False

    def stop_frontend(self, force: bool = False) -> bool:
        """停止前端服务"""
        frontend_port = 3000

        # 先尝试通过管理的进程停止
        if "frontend" in self._processes:
            process = self._processes["frontend"]
            try:
                os.killpg(os.getpgid(process.pid), signal.SIGKILL if force else signal.SIGTERM)
                process.wait(timeout=5 if force else 10)
                del self._processes["frontend"]
                print("✓ 前端已停止")
                return True
            except Exception:
                pass

        # 通过端口查找进程
        try:
            result = subprocess.run(
                ["lsof", "-ti", f":{frontend_port}"],
                capture_output=True, text=True, timeout=5,
            )
            pids = [p for p in result.stdout.strip().split("\n") if p]
            if pids:
                sig = signal.SIGKILL if force else signal.SIGTERM
                for pid_str in pids:
                    try:
                        os.kill(int(pid_str), sig)
                    except OSError:
                        pass
                time.sleep(1)
                print(f"✓ 前端已停止 (PID: {', '.join(pids)})")
                return True
        except Exception:
            pass

        print("前端未运行")
        return True

    def _find_service_dir(self, service: Service) -> Optional[Path]:
        """查找服务目录"""
        # iam 的实际目录是 unified-core（与 topems.sh SERVICES_CONFIG 一致）
        dir_name = service.service_dir or service.name
        if dir_name == "iam":
            dir_name = "unified-core"

        possible_dirs = [
            Path.cwd() / "svc" / dir_name,
            Path(__file__).parent.parent.parent.parent / "svc" / dir_name,
            Path.home() / "TOPEMS" / "svc" / dir_name,
        ]

        for d in possible_dirs:
            if d.exists() and (d / "Cargo.toml").exists():
                return d
        return None

    def _get_log_path(self, service_name: str) -> Path:
        """获取日志文件路径"""
        log_dir = Path(__file__).parent.parent.parent.parent / "logs"
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
