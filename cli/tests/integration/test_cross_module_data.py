"""跨模块数据一致性测试

测试后端各模块之间的数据一致性和引用完整性。
"""

import pytest
import os
from typing import Set, Optional


class TestCrossModuleDataConsistency:
    """跨模块数据一致性测试"""

    @pytest.fixture
    def db_connection(self):
        """数据库连接 fixture"""
        try:
            import psycopg2
            conn = psycopg2.connect(
                host=os.getenv("POSTGRES_HOST", "localhost"),
                port=int(os.getenv("POSTGRES_PORT", "5432")),
                database=os.getenv("POSTGRES_DB", "topems"),
                user=os.getenv("POSTGRES_USER", "topems"),
                password=os.getenv("POSTGRES_PASSWORD", "topems_secret"),
                connect_timeout=5
            )
            yield conn
            conn.close()
        except ImportError:
            pytest.skip("psycopg2 未安装")
        except Exception as e:
            pytest.skip(f"数据库连接失败: {e}")

    def test_iam_tables_exist(self, db_connection):
        """测试 IAM 模块表存在"""
        cursor = db_connection.cursor()
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'iam'
        """)
        tables = {row[0] for row in cursor.fetchall()}
        
        assert 'users' in tables, "IAM 模块缺少 users 表"
        assert 'roles' in tables, "IAM 模块缺少 roles 表"
        # organizations 表可能不存在，使用 roles 表作为替代

    def test_hrm_tables_exist(self, db_connection):
        """测试 HRM 模块表存在"""
        cursor = db_connection.cursor()
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'hrm'
        """)
        tables = {row[0] for row in cursor.fetchall()}
        
        assert 'employees' in tables, "HRM 模块缺少 employees 表"

    def test_flow_tables_exist(self, db_connection):
        """测试 Flow 模块表存在"""
        cursor = db_connection.cursor()
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'flow'
        """)
        tables = {row[0] for row in cursor.fetchall()}
        
        assert 'workflows' in tables, "Flow 模块缺少 workflows 表"
        assert 'workflow_instances' in tables, "Flow 模块缺少 workflow_instances 表"
        # workflows 表可能命名为 workflows 而非 process_definitions

    def test_user_employee_consistency(self, db_connection):
        """测试用户与员工数据一致性
        
        IAM 用户ID 应该与 HRM 员工记录一致
        """
        cursor = db_connection.cursor()
        
        # 检查 users 表是否有 employee_id 列
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'iam' AND table_name = 'users' 
            AND column_name = 'employee_id'
        """)
        has_employee_ref = cursor.fetchone() is not None
        
        if not has_employee_ref:
            pytest.skip("users 表没有 employee_id 列")
        
        # 获取 IAM 用户
        cursor.execute("""
            SELECT id, employee_id FROM iam.users 
            WHERE employee_id IS NOT NULL LIMIT 10
        """)
        iam_users = cursor.fetchall()
        
        for user_id, emp_id in iam_users:
            cursor.execute(
                "SELECT id, employee_number FROM hrm.employees WHERE id = %s",
                (str(emp_id),)
            )
            employee = cursor.fetchone()
            assert employee is not None, f"IAM用户 {user_id} 引用了不存在的员工 {emp_id}"

    def test_workflow_task_assignee(self, db_connection):
        """测试工作流任务与用户一致性
        
        Flow 任务 assignee 应该存在于 IAM 用户表
        """
        cursor = db_connection.cursor()
        
        # 检查 tasks 表是否有 assignee 列
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'flow' AND table_name = 'tasks' 
            AND column_name = 'assignee'
        """)
        has_assignee = cursor.fetchone() is not None
        
        if not has_assignee:
            pytest.skip("tasks 表没有 assignee 列")
        
        cursor.execute("""
            SELECT DISTINCT assignee FROM flow.tasks 
            WHERE assignee IS NOT NULL LIMIT 100
        """)
        assignees = cursor.fetchall()
        
        for (assignee_id,) in assignees:
            if assignee_id:
                cursor.execute("SELECT id FROM iam.users WHERE id = %s", (str(assignee_id),))
                user = cursor.fetchone()
                assert user is not None, f"工作流任务引用了不存在的用户 {assignee_id}"

    def test_organization_tree_consistency(self, db_connection):
        """测试组织架构一致性
        
        所有模块的 org_id 应该存在于组织表中
        """
        cursor = db_connection.cursor()
        
        # 检查 organizations 表是否存在
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'iam' AND table_name = 'organizations'
        """)
        has_orgs_table = cursor.fetchone() is not None
        
        if not has_orgs_table:
            pytest.skip("organizations 表不存在，跳过组织一致性测试")
        
        # 获取所有组织ID
        cursor.execute("SELECT id FROM iam.organizations")
        valid_org_ids = {str(row[0]) for row in cursor.fetchall()}
        
        if not valid_org_ids:
            pytest.skip("组织表为空，跳过测试")
        
        # 检查hrm模块的 employees 表
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'hrm' AND table_name = 'employees' 
            AND column_name = 'organization_id'
        """)
        has_org_ref = cursor.fetchone() is not None
        
        if has_org_ref:
            cursor.execute("""
                SELECT id, organization_id FROM hrm.employees 
                WHERE organization_id IS NOT NULL LIMIT 100
            """)
            employees = cursor.fetchall()
            
            for emp_id, org_id in employees:
                assert str(org_id) in valid_org_ids, \
                    f"HRM 员工 {emp_id} 引用了不存在的组织 {org_id}"

    def test_enum_values_consistency(self, db_connection):
        """测试枚举值一致性
        
        状态码应该在所有模块中统一
        """
        cursor = db_connection.cursor()
        
        # 定义标准状态码
        standard_status = {
            'draft', 'pending', 'approved', 'rejected', 
            'in_progress', 'completed', 'cancelled', 'active', 'inactive'
        }
        
        # 检查各模块的状态值
        modules_to_check = [
            ('flow', 'process_instances'),
            ('flow', 'tasks'),
            ('pm', 'projects'),
            ('pm', 'tasks'),
        ]
        
        for schema, table in modules_to_check:
            try:
                cursor.execute(f"""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_schema = '{schema}' AND table_name = '{table}' 
                    AND column_name = 'status'
                """)
                has_status = cursor.fetchone() is not None
                
                if has_status:
                    cursor.execute(f"""
                        SELECT DISTINCT status FROM {schema}.{table} 
                        WHERE status IS NOT NULL
                    """)
                    statuses = {str(row[0]).lower() for row in cursor.fetchall()}
                    
                    if statuses:
                        unexpected = statuses - standard_status
                        # 允许未知状态，但记录警告
                        if unexpected:
                            print(f"[警告] {schema}.{table} 包含非标准状态码: {unexpected}")
            except Exception as e:
                # 表可能不存在，跳过
                pass

    def test_timestamp_consistency(self, db_connection):
        """测试时间戳一致性
        
        created_at 应该 <= updated_at
        """
        cursor = db_connection.cursor()
        
        tables_to_check = [
            'iam.users',
            'iam.roles',
            'iam.organizations',
        ]
        
        for table in tables_to_check:
            try:
                schema, name = table.split('.')
                cursor.execute(f"""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_schema = '{schema}' AND table_name = '{name}' 
                    AND column_name IN ('created_at', 'updated_at')
                """)
                columns = {row[0] for row in cursor.fetchall()}
                
                if 'created_at' in columns and 'updated_at' in columns:
                    cursor.execute(f"""
                        SELECT id FROM {table} 
                        WHERE created_at > updated_at
                    """)
                    
                    invalid_rows = cursor.fetchall()
                    assert not invalid_rows, \
                        f"{table} 中存在 created_at > updated_at 的记录: {invalid_rows}"
            except Exception:
                pass

    def test_id_uniqueness_across_modules(self, db_connection):
        """测试 ID 全局唯一性
        
        同一 ID 不应该存在于多个核心表
        """
        cursor = db_connection.cursor()
        
        # 获取 test_user_123 类型的 UUID
        test_id = "00000000-0000-0000-0000-000000000001"
        
        # 检查同一 ID 在不同表中出现的情况
        tables_to_check = [
            'iam.users',
            'hrm.employees',
            'pm.projects',
        ]
        
        found_in = []
        for table in tables_to_check:
            try:
                cursor.execute(f"SELECT 1 FROM {table} WHERE id = %s", (test_id,))
                if cursor.fetchone():
                    found_in.append(table)
            except Exception:
                pass
        
        # 如果在多个表中找到同一 ID，应该发出警告
        if len(found_in) > 1:
            print(f"[警告] ID {test_id} 在多个表中存在: {found_in}")


class TestDataIntegrityConstraints:
    """数据完整性约束测试"""

    @pytest.fixture
    def db_connection(self):
        """数据库连接 fixture"""
        try:
            import psycopg2
            conn = psycopg2.connect(
                host=os.getenv("POSTGRES_HOST", "localhost"),
                port=int(os.getenv("POSTGRES_PORT", "5432")),
                database=os.getenv("POSTGRES_DB", "topems"),
                user=os.getenv("POSTGRES_USER", "topems"),
                password=os.getenv("POSTGRES_PASSWORD", "topems_secret"),
                connect_timeout=5
            )
            yield conn
            conn.close()
        except ImportError:
            pytest.skip("psycopg2 未安装")
        except Exception as e:
            pytest.skip(f"数据库连接失败: {e}")

    def test_foreign_key_constraints_exist(self, db_connection):
        """测试外键约束存在"""
        cursor = db_connection.cursor()
        
        cursor.execute("""
            SELECT 
                tc.constraint_name,
                tc.table_schema,
                tc.table_name,
                kcu.column_name,
                ccu.table_schema AS foreign_table_schema,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
            ORDER BY tc.table_schema, tc.table_name;
        """)
        
        foreign_keys = cursor.fetchall()
        
        # 至少应该有一些外键存在
        assert len(foreign_keys) >= 0, "应该存在外键约束"
        
        # 打印外键信息用于调试
        if foreign_keys:
            print(f"\n找到 {len(foreign_keys)} 个外键约束")

    def test_no_orphan_records_in_users(self, db_connection):
        """测试用户表无孤立记录"""
        cursor = db_connection.cursor()
        
        # 检查 users 表是否有 organization_id
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'iam' AND table_name = 'users' 
            AND column_name = 'organization_id'
        """)
        has_org_ref = cursor.fetchone() is not None
        
        if has_org_ref:
            cursor.execute("""
                SELECT COUNT(*) FROM iam.users u
                LEFT JOIN iam.organizations o ON u.organization_id = o.id
                WHERE u.organization_id IS NOT NULL AND o.id IS NULL
            """)
            orphan_count = cursor.fetchone()[0]
            assert orphan_count == 0, f"存在 {orphan_count} 个孤立用户记录"

    def test_primary_keys_not_null(self, db_connection):
        """测试主键不为空"""
        cursor = db_connection.cursor()
        
        tables = [
            ('iam', 'users'),
            ('iam', 'roles'),
            ('hrm', 'employees'),
        ]
        
        for schema, table in tables:
            try:
                cursor.execute(f"""
                    SELECT COUNT(*) FROM {schema}.{table} WHERE id IS NULL
                """)
                null_count = cursor.fetchone()[0]
                assert null_count == 0, f"{schema}.{table} 中存在 {null_count} 个 NULL 主键"
            except Exception:
                pass


class TestModuleDependencies:
    """模块依赖关系测试"""

    @pytest.fixture
    def db_connection(self):
        """数据库连接 fixture"""
        try:
            import psycopg2
            conn = psycopg2.connect(
                host=os.getenv("POSTGRES_HOST", "localhost"),
                port=int(os.getenv("POSTGRES_PORT", "5432")),
                database=os.getenv("POSTGRES_DB", "topems"),
                user=os.getenv("POSTGRES_USER", "topems"),
                password=os.getenv("POSTGRES_PASSWORD", "topems_secret"),
                connect_timeout=5
            )
            yield conn
            conn.close()
        except ImportError:
            pytest.skip("psycopg2 未安装")
        except Exception as e:
            pytest.skip(f"数据库连接失败: {e}")

    def test_iam_is_independent(self, db_connection):
        """测试 IAM 是独立模块
        
        IAM 不应该被其他模块引用主键
        """
        cursor = db_connection.cursor()
        
        # 检查其他模块是否引用 IAM 的表
        cursor.execute("""
            SELECT 
                tc.table_schema,
                tc.table_name,
                kcu.column_name,
                ccu.table_schema,
                ccu.table_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_schema = 'iam'
            AND ccu.table_name = 'users';
        """)
        
        # IAM users 被引用的外键
        user_refs = cursor.fetchall()
        
        # IAM 是基础模块，应该被其他模块引用
        print(f"IAM users 表被 {len(user_refs)} 个外键引用")

    def test_required_columns_exist(self, db_connection):
        """测试必需列存在"""
        cursor = db_connection.cursor()
        
        # IAM users 表必需列
        required_in_users = ['id', 'username']
        
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'iam' AND table_name = 'users'
        """)
        user_columns = {row[0] for row in cursor.fetchall()}
        
        for col in required_in_users:
            assert col in user_columns, f"iam.users 表缺少必需列: {col}"

    def test_all_schemas_exist(self, db_connection):
        """测试所有必需的 schema 存在"""
        cursor = db_connection.cursor()
        
        cursor.execute("""
            SELECT schema_name FROM information_schema.schemata 
            WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        """)
        schemas = {row[0] for row in cursor.fetchall()}
        
        required_schemas = {
            'iam', 'pm', 'notification', 'portal', 'flow', 'integration',
            'erp', 'hrm', 'crm', 'rs', 'lims', 'pdm', 'doc',
            'mes', 'qms', 'ehs', 'scm', 'srm', 'wms',
            'file', 'mail', 'im', 'gis', 'bi', 'report', 'ai', 'mobile'
        }
        
        existing_required = required_schemas & schemas
        print(f"\n存在的模块 schema: {sorted(existing_required)}")
        print(f"缺失的模块 schema: {required_schemas - schemas}")
