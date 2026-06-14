"""测试配置文件"""

import os
import sys
from pathlib import Path

# 添加 src 目录到路径
test_dir = Path(__file__).parent
cli_dir = test_dir.parent
src_dir = cli_dir / "src"

sys.path.insert(0, str(src_dir))

# 测试配置
TEST_CONFIG_PATH = cli_dir / "config" / "services.yaml"
TEST_TIMEOUT = 5  # 秒
