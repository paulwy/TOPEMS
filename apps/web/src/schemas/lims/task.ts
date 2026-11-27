/**
 * 检测任务 Schema — 驱动 LimsTaskPage 的完整 CRUD
 *
 * 与 inspectionTask.ts 指向同一个后端资源（/api/lims/tasks，见
 * svc/lims/src/modules/inspection_task.rs）。此前这里自成一套字段
 * （task_code / task_name / method_id / assignee ...），后端根本没有这些列，
 * 新建提交后字段被静默丢弃、且必填的 test_items 缺失 → 422 missing field。
 * 现直接复用已对齐后端的 inspectionTaskSchema，只换标题与 entity 键，
 * 避免同一份表结构在两个 schema 里各自漂移。
 */
import type { EntitySchema } from '@/schema-dsl';
import i18n from '@/i18n';
import { inspectionTaskSchema } from './inspectionTask';

export const taskSchema: EntitySchema = {
  ...inspectionTaskSchema,
  entity: 'limsTask',
  title: i18n.t('lims.task.k0'),
  description: i18n.t('lims.task.k1'),
  createTitle: i18n.t('lims.task.k47'),
  editTitle: i18n.t('lims.task.k48'),
  detailTitle: i18n.t('lims.task.k49'),
};
