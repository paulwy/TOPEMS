-- 2026-10-17 hrm contracts 域：前端契约概要字段补齐（字段级对拍 hrm 专项）
-- 背景：字段对拍（/tmp/diff_fields.py hrm）发现前端 Contract 类型（apps/web/src/api/hrm/types.ts，14 字段）
--       与后端 Contract struct（svc/hrm/src/models/contract.rs）语义分裂：前端页面 HrmContractDetailPage
--       （路由注册于 modules/hrm/config.ts:693）实调 contract.contractNo/contract_name/base_salary/currency/
--       salary_type/work_location/probation_end_date/probation_period/contract_file/remark 等契约概要字段，
--       后端/DB hrm.contracts 无对应列 → 页面显示 '-' 撒谎面。列表/表单（HrmContractPage + contractSchema）
--       用 contractNo 列/搜索/表单（后端输出 contract_no → 列空）。
-- 方案（后端宽容零回归）：Contract/CreateContractRequest/UpdateContractRequest struct 输出/入参统一
--       rename 到前端契约命名（contract_no→contractNo、salary→base_salary、probation_period_days→
--       probation_period、contract_file_path→contract_file、notes→remark，均 alias 旧键双兼容），
--       本迁移补 7 列（contract_name/currency/salary_type/work_location/probation_end_date/department/
--       position），department/position 冗余存员工快照避免 JOIN（详情页直接显示）。
-- 幂等：ADD COLUMN IF NOT EXISTS 可重复执行。

ALTER TABLE hrm.contracts
    ADD COLUMN IF NOT EXISTS contract_name varchar(256),
    ADD COLUMN IF NOT EXISTS currency varchar(16),
    ADD COLUMN IF NOT EXISTS salary_type varchar(32),
    ADD COLUMN IF NOT EXISTS work_location varchar(256),
    ADD COLUMN IF NOT EXISTS probation_end_date timestamptz,
    ADD COLUMN IF NOT EXISTS department varchar(256),
    ADD COLUMN IF NOT EXISTS position varchar(256);
