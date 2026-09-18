pub mod faq;
pub mod guide;

use sqlx::PgPool;

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_faqs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            category VARCHAR(100) NOT NULL DEFAULT 'general',
            views BIGINT NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT true,
            sort_order INT NOT NULL DEFAULT 0,
            -- 平台级全局共享内容：tenant_id NULL = 所有租户可见
            tenant_id UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_faqs_category ON core_faqs(category);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_faqs_active ON core_faqs(is_active);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_faqs_sort ON core_faqs(sort_order);")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_guides (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            category VARCHAR(100) NOT NULL DEFAULT 'general',
            duration VARCHAR(50) NOT NULL DEFAULT '10min',
            lessons_count INT NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT true,
            sort_order INT NOT NULL DEFAULT 0,
            -- 平台级全局共享内容：tenant_id NULL = 所有租户可见
            tenant_id UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_guides_category ON core_guides(category);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_guides_active ON core_guides(is_active);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_guides_sort ON core_guides(sort_order);")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_guide_lessons (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            guide_id UUID NOT NULL REFERENCES core_guides(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            duration VARCHAR(50) NOT NULL DEFAULT '5min',
            sort_order INT NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT true,
            -- 平台级全局共享内容：tenant_id NULL = 所有租户可见
            tenant_id UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_guide_lessons_guide_id ON core_guide_lessons(guide_id);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_guide_lessons_active ON core_guide_lessons(is_active);")
        .execute(pool)
        .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_guide_lessons_sort ON core_guide_lessons(sort_order);",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_guide_progress (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            guide_id UUID NOT NULL REFERENCES core_guides(id) ON DELETE CASCADE,
            user_id VARCHAR(255) NOT NULL,
            completed_lessons UUID[] NOT NULL DEFAULT '{}',
            progress INT NOT NULL DEFAULT 0,
            completed_at TIMESTAMPTZ,
            -- 平台级全局共享内容：tenant_id NULL = 所有租户可见
            tenant_id UUID,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(guide_id, user_id)
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_guide_progress_user ON core_guide_progress(user_id);",
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_guide_progress_guide ON core_guide_progress(guide_id);")
        .execute(pool)
        .await?;

    seed_help_data(pool).await?;

    Ok(())
}

async fn seed_help_data(pool: &PgPool) -> Result<(), sqlx::Error> {
    let faq_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM core_faqs")
        .fetch_one(pool)
        .await?;

    if faq_count > 0 {
        tracing::info!("帮助中心数据已存在，跳过初始化");
        return Ok(());
    }

    tracing::info!("开始初始化帮助中心数据...");

    let faqs = vec![
        (
            "如何修改登录密码？",
            "您可以通过以下步骤修改登录密码：\n1. 点击右上角头像，选择\"个人设置\"\n2. 进入\"账号安全\"页面\n3. 点击\"修改密码\"\n4. 输入旧密码和新密码\n5. 点击\"确认\"完成修改\n建议密码长度至少8位，包含字母、数字和特殊字符。",
            "general",
        ),
        (
            "如何申请权限？",
            "权限申请流程如下：\n1. 在系统中点击\"权限管理\"->\"权限申请\"\n2. 选择需要的权限模块\n3. 填写申请原因\n4. 提交审批\n5. 等待审批通过后权限自动生效\n您也可以联系管理员获取权限。",
            "security",
        ),
        (
            "如何导出数据？",
            "系统支持多种数据导出方式：\n1. 在列表页面点击\"导出\"按钮\n2. 选择导出格式（Excel/CSV/PDF）\n3. 设置导出范围和筛选条件\n4. 点击\"确定\"下载文件\n导出的数据会包含当前页面所有可见字段。",
            "general",
        ),
        (
            "如何创建审批流程？",
            "创建审批流程步骤：\n1. 进入\"流程管理\"->\"流程设计\"\n2. 点击\"新建流程\"\n3. 配置流程名称和描述\n4. 添加审批节点（支持串行、并行、条件分支）\n5. 设置审批人规则\n6. 保存并发布流程\n发布后即可在业务模块中使用该流程。",
            "workflow",
        ),
        (
            "如何处理待办任务？",
            "处理待办任务：\n1. 点击左侧导航\"任务\"->\"待办\"\n2. 选择需要处理的任务\n3. 查看任务详情\n4. 根据任务要求执行相应操作\n5. 更新任务状态\n6. 提交审批（如需）\n任务状态包括：待处理、进行中、审核中、已完成、已取消。",
            "general",
        ),
        (
            "如何查看审计日志？",
            "查看审计日志：\n1. 进入\"系统管理\"->\"审计日志\"\n2. 设置筛选条件（时间范围、操作类型、用户等）\n3. 点击\"查询\"获取日志列表\n4. 点击日志条目查看详细信息\n审计日志记录了所有关键操作，包括操作时间、操作人、操作内容等。",
            "security",
        ),
        (
            "如何备份数据？",
            "数据备份操作：\n1. 进入\"系统管理\"->\"数据备份\"\n2. 点击\"创建备份\"\n3. 选择备份类型（全量/增量）\n4. 设置备份名称\n5. 点击\"开始备份\"\n系统会自动保存备份文件，您可以随时下载或恢复备份。",
            "security",
        ),
        (
            "如何使用AI助手？",
            "使用AI助手：\n1. 点击页面右下角的AI图标\n2. 在对话框中输入您的问题\n3. 点击\"发送\"获取回答\nAI助手支持：智能问答、文档分析、代码生成、数据查询等功能。",
            "ai",
        ),
        (
            "如何添加新员工？",
            "添加新员工步骤：\n1. 进入\"人力资源\"->\"员工管理\"\n2. 点击\"添加员工\"\n3. 填写员工基本信息\n4. 选择部门和岗位\n5. 设置角色和权限\n6. 保存并发送入职通知\n新员工会收到系统邮件，包含登录账号和初始密码。",
            "hrm",
        ),
        (
            "如何申请请假？",
            "请假申请流程：\n1. 进入\"人力资源\"->\"考勤管理\"\n2. 点击\"请假申请\"\n3. 选择请假类型（年假/病假/事假等）\n4. 设置请假时间\n5. 填写请假原因\n6. 提交审批\n审批通过后自动记录考勤。",
            "hrm",
        ),
        (
            "如何录入凭证？",
            "凭证录入步骤：\n1. 进入\"财务管理\"->\"凭证管理\"\n2. 点击\"新增凭证\"\n3. 选择凭证类型\n4. 填写凭证日期和摘要\n5. 添加分录（借方和贷方）\n6. 保存并提交审批\n系统会自动校验借贷平衡。",
            "finance",
        ),
        (
            "如何生成报表？",
            "生成报表：\n1. 进入\"财务管理\"->\"报表中心\"\n2. 选择报表类型\n3. 设置报表期间\n4. 点击\"生成\"\n5. 预览或导出报表\n支持的报表包括：资产负债表、利润表、现金流量表等。",
            "finance",
        ),
    ];

    for (question, answer, category) in &faqs {
        sqlx::query(r#"INSERT INTO core_faqs (question, answer, category, tenant_id) VALUES ($1, $2, $3, $4)"#)
            .bind(*question)
            .bind(*answer)
            .bind(*category)
            .bind(uuid::Uuid::nil())
            .execute(pool)
            .await?;
    }

    let guides = vec![
        (
            "系统快速入门",
            "快速了解系统基本功能和操作流程",
            "getting-started",
            "15min",
            3,
        ),
        (
            "用户管理指南",
            "学习如何管理用户、角色和权限",
            "security",
            "20min",
            4,
        ),
        (
            "审批流程设计",
            "掌握审批流程的创建和配置方法",
            "workflow",
            "30min",
            5,
        ),
        (
            "员工入职流程",
            "学习完整的员工入职操作流程",
            "hrm",
            "25min",
            4,
        ),
        (
            "考勤管理操作",
            "掌握考勤打卡、请假、加班等功能",
            "hrm",
            "20min",
            4,
        ),
        (
            "财务凭证处理",
            "学习财务凭证的录入、审核和记账",
            "finance",
            "30min",
            5,
        ),
        (
            "报表生成与分析",
            "掌握各类财务报表的生成和解读",
            "finance",
            "25min",
            4,
        ),
        (
            "AI助手使用教程",
            "学习如何利用AI助手提升工作效率",
            "ai",
            "15min",
            3,
        ),
        (
            "数据备份与恢复",
            "掌握数据备份和恢复的操作方法",
            "security",
            "20min",
            4,
        ),
        (
            "审计日志查看",
            "学习如何查看和分析系统审计日志",
            "security",
            "15min",
            3,
        ),
        (
            "移动端使用指南",
            "学习如何在手机端使用系统",
            "general",
            "10min",
            2,
        ),
        (
            "快捷键操作",
            "掌握常用快捷键，提升操作效率",
            "general",
            "10min",
            2,
        ),
    ];

    for (title, description, category, duration, lessons_count) in &guides {
        sqlx::query(
            r#"INSERT INTO core_guides (title, description, category, duration, lessons_count, tenant_id) VALUES ($1, $2, $3, $4, $5, $6)"#,
        )
        .bind(*title)
        .bind(*description)
        .bind(*category)
        .bind(*duration)
        .bind(*lessons_count)
        .bind(uuid::Uuid::nil())
        .execute(pool)
        .await?;
    }

    tracing::info!(
        "帮助中心数据初始化完成（{} 条FAQ，{} 条指南）",
        faqs.len(),
        guides.len()
    );
    Ok(())
}
