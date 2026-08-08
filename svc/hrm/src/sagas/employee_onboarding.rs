//! 员工入职 Saga
//!
//! 编排员工入职的完整流程，包含四个步骤：
//! 1. 创建员工档案（forward: 写入 employees 表，compensate: 标记为离职/删除）
//! 2. 创建用户账号（forward: 调用 IAM 创建账号，compensate: 禁用账号）
//! 3. 分配默认权限（forward: 调用 IAM 分配角色，compensate: 撤销角色）
//! 4. 创建入职费用应付凭证（forward: 调用 Finance/ERP 创建应付凭证，compensate: 冲销凭证）
//!
//! 本文件为样板实现，forward/compensate 仅记录日志，不做真实数据库操作。

use tracing::info;
use uuid::Uuid;

use topems_shared_event::saga::{SagaInstance, SagaOrchestrator, SagaResult, SagaStepDefinition};

/// 员工入职 Saga
#[allow(dead_code)]
pub struct EmployeeOnboardingSaga;

#[allow(dead_code)]
impl EmployeeOnboardingSaga {
    pub fn new() -> Self {
        Self
    }

    /// 执行员工入职 Saga
    ///
    /// 传入员工 ID、姓名、邮箱与所属部门 ID，构造四个步骤的 SagaStepDefinition，
    /// 委托给 SagaOrchestrator 执行，返回 Saga 实例 ID。
    pub async fn execute(
        &self,
        orchestrator: &SagaOrchestrator,
        employee_id: Uuid,
        name: String,
        email: String,
        department_id: Option<Uuid>,
    ) -> SagaResult<Uuid> {
        let employee_id_for_step1 = employee_id;
        let employee_id_for_step2 = employee_id;
        let employee_id_for_step3 = employee_id;
        let employee_id_for_step4 = employee_id;
        let name_for_step1 = name.clone();
        let name_for_step2 = name.clone();
        let email_for_step1 = email.clone();
        let email_for_step2 = email.clone();
        let department_id_for_step1 = department_id;

        let steps = vec![
            // Step 1: 创建员工档案
            SagaStepDefinition {
                name: "create_employee_record".to_string(),
                forward_action: Box::new(move |_saga: SagaInstance| {
                    let name = name_for_step1.clone();
                    let email = email_for_step1.clone();
                    Box::pin(async move {
                        info!(
                            employee_id = %employee_id_for_step1,
                            name = %name,
                            email = %email,
                            department_id = ?department_id_for_step1,
                            "[create_employee_record] forward: 写入 employees 表，创建员工档案"
                        );
                        Ok(())
                    })
                }),
                compensate_action: Some(Box::new(move |_saga: SagaInstance| {
                    Box::pin(async move {
                        info!(
                            employee_id = %employee_id_for_step1,
                            "[create_employee_record] compensate: 标记员工为离职/删除"
                        );
                        Ok(())
                    })
                })),
            },
            // Step 2: 创建用户账号
            SagaStepDefinition {
                name: "create_user_account".to_string(),
                forward_action: Box::new(move |_saga: SagaInstance| {
                    let name = name_for_step2.clone();
                    let email = email_for_step2.clone();
                    Box::pin(async move {
                        info!(
                            employee_id = %employee_id_for_step2,
                            name = %name,
                            email = %email,
                            "[create_user_account] forward: 调用 IAM 创建用户账号"
                        );
                        Ok(())
                    })
                }),
                compensate_action: Some(Box::new(move |_saga: SagaInstance| {
                    Box::pin(async move {
                        info!(
                            employee_id = %employee_id_for_step2,
                            "[create_user_account] compensate: 禁用用户账号"
                        );
                        Ok(())
                    })
                })),
            },
            // Step 3: 分配默认权限
            SagaStepDefinition {
                name: "assign_default_permissions".to_string(),
                forward_action: Box::new(move |_saga: SagaInstance| {
                    Box::pin(async move {
                        info!(
                            employee_id = %employee_id_for_step3,
                            "[assign_default_permissions] forward: 调用 IAM 分配默认角色"
                        );
                        Ok(())
                    })
                }),
                compensate_action: Some(Box::new(move |_saga: SagaInstance| {
                    Box::pin(async move {
                        info!(
                            employee_id = %employee_id_for_step3,
                            "[assign_default_permissions] compensate: 撤销已分配的角色"
                        );
                        Ok(())
                    })
                })),
            },
            // Step 4: 创建入职费用应付凭证
            SagaStepDefinition {
                name: "create_onboarding_cost_voucher".to_string(),
                forward_action: Box::new(move |_saga: SagaInstance| {
                    Box::pin(async move {
                        info!(
                            employee_id = %employee_id_for_step4,
                            "[create_onboarding_cost_voucher] forward: 调用 Finance/ERP 创建入职费用应付凭证"
                        );
                        Ok(())
                    })
                }),
                compensate_action: Some(Box::new(move |_saga: SagaInstance| {
                    Box::pin(async move {
                        info!(
                            employee_id = %employee_id_for_step4,
                            "[create_onboarding_cost_voucher] compensate: 冲销入职费用应付凭证"
                        );
                        Ok(())
                    })
                })),
            },
        ];

        let payload = serde_json::json!({
            "employee_id": employee_id,
            "name": name,
            "email": email,
            "department_id": department_id,
        });

        orchestrator
            .execute_saga("employee_onboarding", payload, steps)
            .await
    }
}

impl Default for EmployeeOnboardingSaga {
    fn default() -> Self {
        Self::new()
    }
}
