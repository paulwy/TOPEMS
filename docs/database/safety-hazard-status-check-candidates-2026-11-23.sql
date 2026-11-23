-- B198 安全问题（ehs.safety_hazards）状态候选约束（2026-11-23）
--
-- 目标：把 `ehs.safety_hazards.status` 收敛到唯一枚举
--   `SafetyHazardStatus` → ehs.safety_hazards.status
--
-- 该列此前三套口径并存：前端默认 `reported`、DB 默认 `pending`、后端创建硬编码 `active`；
-- 本地 11 行历史数据均为 `active`（前端无对应标签，只能灰色兜底）。
-- 本批统一为 `reported`：默认值改为 `reported`，历史 `active` 归一为 `reported`。
-- 约束以 NOT VALID 应用，生产历史行不做回填校验，只约束后续写入；生产需按窗口单独 VALIDATE。
-- 注意：生产执行时 `UPDATE ... WHERE status='active'` 需按业务确认后再跑（本批只对本地生效）。

ALTER TABLE ehs.safety_hazards
  ALTER COLUMN status SET DEFAULT 'reported';

UPDATE ehs.safety_hazards
   SET status = 'reported'
 WHERE status = 'active';

ALTER TABLE ehs.safety_hazards
  ADD CONSTRAINT ck_ehs_safety_hazards_status_standard
  CHECK (status IN ('reported', 'pending_approval', 'rectifying', 'pending_verification',
                    'verified', 'closed', 'rejected', 'resolved'))
  NOT VALID;
