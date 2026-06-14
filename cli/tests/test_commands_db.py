"""测试 db 命令"""

import pytest
from click.testing import CliRunner
import os

from topems_cli.commands.db import db, get_db_config


class TestDbCommand:
    """db 命令测试"""

    @pytest.fixture
    def runner(self):
        return CliRunner()

    def test_db_help(self, runner):
        """测试 --help 选项"""
        result = runner.invoke(db, ['--help'])
        assert result.exit_code == 0
        assert 'status' in result.output.lower()

    def test_db_status_help(self, runner):
        """测试 db status --help"""
        result = runner.invoke(db, ['status', '--help'])
        assert result.exit_code == 0

    def test_db_init_help(self, runner):
        """测试 db init --help"""
        result = runner.invoke(db, ['init', '--help'])
        assert result.exit_code == 0


class TestDbConfig:
    """数据库配置测试"""

    def test_get_db_config_defaults(self):
        """测试默认配置"""
        # 保存原始环境变量
        original_host = os.getenv("POSTGRES_HOST")
        
        try:
            # 清除环境变量
            os.environ.pop("POSTGRES_HOST", None)
            
            config = get_db_config()
            
            assert config["host"] == "localhost"
            assert config["port"] == "5432"
            assert config["user"] == "topems"
            assert config["database"] == "topems"
        finally:
            # 恢复环境变量
            if original_host:
                os.environ["POSTGRES_HOST"] = original_host

    def test_get_db_config_from_env(self):
        """测试从环境变量读取配置"""
        os.environ["POSTGRES_HOST"] = "testhost"
        os.environ["POSTGRES_PORT"] = "5433"
        
        config = get_db_config()
        
        assert config["host"] == "testhost"
        assert config["port"] == "5433"
        
        # 清理
        os.environ.pop("POSTGRES_HOST", None)
        os.environ.pop("POSTGRES_PORT", None)
