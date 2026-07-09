import React from 'react';
import {
  TimelinePageTemplate,
  type TimelineNode,
  type TimelineGroup,
} from '../../components/templates/TimelinePageTemplate';
import { Plus, Rocket, Target, Calendar, CheckCircle } from 'lucide-react';

const today = new Date();
const formatDate = (daysOffset: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

const groups: TimelineGroup[] = [
  {
    id: 'milestones',
    title: '里程碑',
    icon: <Rocket style={{ width: 18, height: 18 }} />,
    color: '#8B5CF6',
    collapsible: true,
    nodes: [
      {
        id: 'm1',
        title: '项目启动',
        description: '项目正式启动，团队组建完成',
        date: formatDate(-10),
        type: 'milestone',
        status: 'completed',
        priority: 'high',
        participants: [
          { id: '1', name: '张三' },
          { id: '2', name: '李四' },
        ],
      },
      {
        id: 'm2',
        title: '需求评审',
        description: '完成产品需求文档评审',
        date: formatDate(-5),
        type: 'milestone',
        status: 'completed',
        priority: 'high',
        participants: [{ id: '3', name: '王五' }],
      },
      {
        id: 'm3',
        title: '设计完成',
        description: 'UI设计和技术方案设计完成',
        date: formatDate(5),
        type: 'milestone',
        status: 'in-progress',
        priority: 'medium',
      },
      {
        id: 'm4',
        title: '开发完成',
        description: '核心功能开发完成',
        date: formatDate(20),
        type: 'milestone',
        status: 'pending',
        priority: 'high',
      },
      {
        id: 'm5',
        title: '测试上线',
        description: '完成测试并正式上线',
        date: formatDate(35),
        type: 'milestone',
        status: 'pending',
        priority: 'high',
      },
    ],
  },
  {
    id: 'tasks',
    title: '任务',
    icon: <Target style={{ width: 18, height: 18 }} />,
    color: '#3B82F6',
    collapsible: true,
    nodes: [
      {
        id: 't1',
        title: '数据库设计',
        description: '完成数据库表结构设计',
        date: formatDate(-3),
        time: '09:00',
        type: 'task',
        status: 'completed',
        priority: 'high',
        tags: [{ label: '开发', color: '#22C55E' }],
      },
      {
        id: 't2',
        title: 'API接口开发',
        description: '开发RESTful API接口',
        date: formatDate(2),
        time: '14:00',
        type: 'task',
        status: 'in-progress',
        priority: 'high',
        tags: [{ label: '开发', color: '#22C55E' }],
        children: [
          {
            id: 't2-1',
            title: '用户模块API',
            date: formatDate(0),
            type: 'task',
            status: 'completed',
          },
          {
            id: 't2-2',
            title: '订单模块API',
            date: formatDate(3),
            type: 'task',
            status: 'in-progress',
          },
          {
            id: 't2-3',
            title: '报表模块API',
            date: formatDate(8),
            type: 'task',
            status: 'pending',
          },
        ],
      },
      {
        id: 't3',
        title: '前端页面开发',
        description: '开发用户界面',
        date: formatDate(10),
        type: 'task',
        status: 'pending',
        priority: 'medium',
        tags: [{ label: '前端', color: '#06B6D4' }],
      },
    ],
  },
  {
    id: 'meetings',
    title: '会议',
    icon: <Calendar style={{ width: 18, height: 18 }} />,
    color: '#F59E0B',
    collapsible: true,
    nodes: [
      {
        id: 'mt1',
        title: '周例会',
        description: '项目进度同步和问题讨论',
        date: formatDate(0),
        time: '10:00',
        type: 'meeting',
        location: '会议室A',
        participants: [
          { id: '1', name: '张三' },
          { id: '2', name: '李四' },
          { id: '3', name: '王五' },
          { id: '4', name: '赵六' },
        ],
      },
      {
        id: 'mt2',
        title: '技术评审会',
        description: '技术方案评审',
        date: formatDate(8),
        time: '14:00',
        type: 'meeting',
        location: '会议室B',
      },
    ],
  },
];

export const ProjectTimelinePage: React.FC = () => {
  return (
    <TimelinePageTemplate
      title='项目时间线'
      subtitle='跟踪项目里程碑、任务和会议安排'
      nodes={[]}
      groups={groups}
      showSearch
      showFilter
      showTimeRange
      timeRanges={[
        { id: 'today', label: '今天', start: today, end: today },
        {
          id: 'week',
          label: '本周',
          start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: today,
        },
        {
          id: 'month',
          label: '本月',
          start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
        { id: 'all', label: '全部', start: new Date(0), end: new Date() },
      ]}
      selectedTimeRange='month'
      actions={[
        {
          label: '添加事件',
          icon: <Plus style={{ width: 16, height: 16 }} />,
          onClick: () => {},
        },
      ]}
    />
  );
};

export default ProjectTimelinePage;
