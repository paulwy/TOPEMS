"""健康检查模块"""

import asyncio
import socket
import time
from dataclasses import dataclass
from typing import Optional

import httpx


@dataclass
class HealthCheckResult:
    """健康检查结果"""
    service_name: str
    port: int
    is_healthy: bool
    response_time_ms: Optional[float] = None
    message: str = ""
    error: Optional[str] = None


def check_port(host: str, port: int, timeout: float = 1.0) -> bool:
    """检查端口是否开放（同步版本）"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception:
        return False


async def check_health_async(
    service_name: str,
    host: str,
    port: int,
    path: str = "/health",
    timeout: float = 5.0,
) -> HealthCheckResult:
    """异步健康检查"""
    url = f"http://{host}:{port}{path}"
    start_time = time.time()

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url)
            response_time = (time.time() - start_time) * 1000

            if response.status_code == 200:
                return HealthCheckResult(
                    service_name=service_name,
                    port=port,
                    is_healthy=True,
                    response_time_ms=response_time,
                    message="OK",
                )
            else:
                return HealthCheckResult(
                    service_name=service_name,
                    port=port,
                    is_healthy=False,
                    response_time_ms=response_time,
                    message=f"HTTP {response.status_code}",
                )

    except httpx.ConnectError:
        return HealthCheckResult(
            service_name=service_name,
            port=port,
            is_healthy=False,
            error="连接失败",
        )
    except httpx.TimeoutException:
        return HealthCheckResult(
            service_name=service_name,
            port=port,
            is_healthy=False,
            error="超时",
        )
    except Exception as e:
        return HealthCheckResult(
            service_name=service_name,
            port=port,
            is_healthy=False,
            error=str(e),
        )


def check_health(
    service_name: str,
    host: str,
    port: int,
    path: str = "/health",
    timeout: float = 5.0,
) -> HealthCheckResult:
    """同步健康检查"""
    return asyncio.run(check_health_async(service_name, host, port, path, timeout))


async def check_multiple_services_async(
    services: list[tuple[str, int]],
    timeout: float = 5.0,
) -> list[HealthCheckResult]:
    """异步检查多个服务"""
    tasks = [
        check_health_async(name, "localhost", port, timeout=timeout)
        for name, port in services
    ]
    return await asyncio.gather(*tasks)


def check_multiple_services(
    services: list[tuple[str, int]],
    timeout: float = 5.0,
) -> list[HealthCheckResult]:
    """同步检查多个服务"""
    return asyncio.run(check_multiple_services_async(services, timeout))
