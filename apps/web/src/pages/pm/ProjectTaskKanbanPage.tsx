import React, { useState } from 'react';
import {
  KanbanPageTemplate,
  type KanbanColumn,
} from '../../components/templates/KanbanPageTemplate';
import { Plus } from 'lucide-react';

const initialColumns: KanbanColumn[] = [
  {
    id: 'backlog',
    title: '待办',
    status: 'backlog',
    color: 'text.muted',
    cards: [
      {
        id: 'card-1',
        title: '完成产品需求文档',
        description: '编写详细的产品需求文档，包含功能描述和用户故事',
        priority: 'high',
        assignee: { id: '1', name: '张三' },
        dueDate: '2026-03-20',
        tags: [{ label: '文档', color: 'primary.main' }],
        subtasks: { total: 5, completed: 3 },
        comments: 2,
      },
      {
        id: 'card-2',
        title: '设计系统架构图',
        description: '绘制系统整体架构图，包括模块划分和数据流',
        priority: 'medium',
        assignee: { id: '2', name: '李四' },
        dueDate: '2026-03-22',
        tags: [{ label: '设计', color: 'secondary.main' }],
      },
    ],
  },
  {
    id: 'in-progress',
    title: '进行中',
    status: 'in-progress',
    color: 'primary.500',
    cards: [
      {
        id: 'card-3',
        title: '数据库设计',
        description: '设计数据库表结构，定义索引和约束',
        priority: 'high',
        assignee: { id: '3', name: '王五' },
        dueDate: '2026-03-18',
        tags: [{ label: '开发', color: 'success.main' }],
        subtasks: { total: 8, completed: 5 },
        comments: 5,
        attachments: 3,
      },
    ],
  },
  {
    id: 'review',
    title: '待评审',
    status: 'review',
    color: 'warning.500',
    cards: [
      {
        id: 'card-4',
        title: 'API接口文档',
        description: '编写RESTful API接口文档',
        priority: 'medium',
        assignee: { id: '4', name: '赵六' },
        dueDate: '2026-03-19',
        tags: [{ label: '文档', color: 'primary.main' }],
      },
    ],
  },
  {
    id: 'completed',
    title: '已完成',
    status: 'completed',
    color: 'success.500',
    collapsible: true,
    cards: [
      {
        id: 'card-5',
        title: '项目立项',
        description: '完成项目立项申请和审批',
        assignee: { id: '1', name: '张三' },
        dueDate: '2026-03-10',
      },
      {
        id: 'card-6',
        title: '团队组建',
        description: '确定项目团队成员和职责分工',
        assignee: { id: '2', name: '李四' },
        dueDate: '2026-03-12',
      },
    ],
  },
];

export const ProjectTaskKanbanPage: React.FC = () => {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);

  const handleCardMove = (cardId: string, sourceColumn: string, targetColumn: string) => {
    const sourceCol = columns.find((col) => col.id === sourceColumn);
    const targetCol = columns.find((col) => col.id === targetColumn);
    if (!sourceCol || !targetCol) return;

    const cardIndex = sourceCol.cards.findIndex((card) => card.id === cardId);
    if (cardIndex === -1) return;

    const [card] = sourceCol.cards.splice(cardIndex, 1);
    targetCol.cards.push(card);

    setColumns([...columns]);
  };

  return (
    <KanbanPageTemplate
      title='项目任务看板'
      subtitle='可视化管理项目任务，拖拽卡片调整状态'
      columns={columns}
      onCardMove={handleCardMove}
      showStats
      showSearch
      showFilter
      actions={[
        {
          label: '新建任务',
          icon: <Plus style={{ width: 16, height: 16 }} />,
          onClick: () => {},
        },
      ]}
    />
  );
};

export default ProjectTaskKanbanPage;
