import React, { useState } from 'react';
import { Todo, portalApi } from '../api/portal';

interface TodoListProps {
  todos: Todo[];
  onUpdate: () => void;
}

type TodoTypeFilter = 'all' | 'personal' | 'approval' | 'notification' | 'system';

const TodoList: React.FC<TodoListProps> = ({ todos, onUpdate }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<TodoTypeFilter>('all');
  const [newTodo, setNewTodo] = useState({
    title: '',
    service: '',
    due_date: '',
    priority: 'medium',
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return priority;
    }
  };

  const getTypeIcon = (todoType: string) => {
    switch (todoType) {
      case 'approval':
        return '✏️';
      case 'notification':
        return '🔔';
      case 'system':
        return '⚙️';
      default:
        return '📝';
    }
  };

  const getTypeText = (todoType: string) => {
    switch (todoType) {
      case 'approval':
        return '审批';
      case 'notification':
        return '通知';
      case 'system':
        return '系统';
      default:
        return '个人';
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await portalApi.completeTodo(id);
      onUpdate();
    } catch (err) {
      console.error('Failed to complete todo:', err);
    }
  };

  const handleAdd = async () => {
    if (!newTodo.title || !newTodo.service || !newTodo.due_date) {
      return;
    }
    try {
      await portalApi.addTodo(newTodo.title, newTodo.service, newTodo.due_date, newTodo.priority);
      setShowAddModal(false);
      setNewTodo({ title: '', service: '', due_date: '', priority: 'medium' });
      onUpdate();
    } catch (err) {
      console.error('Failed to add todo:', err);
    }
  };

  const filteredTodos = todos.filter((todo) => {
    if (!todo.completed && filter === 'all') return true;
    if (!todo.completed && filter === todo.todo_type) return true;
    return false;
  });

  const typeCounts = {
    all: todos.filter((t) => !t.completed).length,
    personal: todos.filter((t) => !t.completed && t.todo_type === 'personal').length,
    approval: todos.filter((t) => !t.completed && t.todo_type === 'approval').length,
    notification: todos.filter((t) => !t.completed && t.todo_type === 'notification').length,
    system: todos.filter((t) => !t.completed && t.todo_type === 'system').length,
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-xl mr-2">📋</span>
            <h3 className="text-lg font-semibold text-gray-900">统一待办中心</h3>
            <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
              {typeCounts.all}
            </span>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
          >
            + 添加待办
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-100">
        {([
          { key: 'all' as TodoTypeFilter, label: '全部', count: typeCounts.all },
          { key: 'approval' as TodoTypeFilter, label: '审批', count: typeCounts.approval },
          { key: 'notification' as TodoTypeFilter, label: '通知', count: typeCounts.notification },
          { key: 'system' as TodoTypeFilter, label: '系统', count: typeCounts.system },
          { key: 'personal' as TodoTypeFilter, label: '个人', count: typeCounts.personal },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center space-x-1 ${
              filter === key
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>{label}</span>
            {count > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-gray-200 rounded-full">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {filteredTodos.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            暂无待办事项
          </div>
        ) : (
          filteredTodos.map((todo) => (
            <div
              key={todo.id}
              className={`p-4 hover:bg-gray-50 transition-colors flex items-center justify-between ${
                todo.todo_type === 'approval' ? 'bg-blue-50/30' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleComplete(todo.id)}
                  className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-primary-500 hover:bg-primary-500 transition-colors flex items-center justify-center"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <div>
                  <div className="font-medium text-gray-900 flex items-center space-x-2">
                    {getTypeIcon(todo.todo_type)}
                    {todo.link_url ? (
                      <a
                        href={todo.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary-600 transition-colors"
                      >
                        {todo.title}
                      </a>
                    ) : (
                      <span>{todo.title}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="text-primary-600">{todo.service_name}</span>
                    <span className="mx-2">·</span>
                    <span>{getTypeText(todo.todo_type)}</span>
                    <span className="mx-2">·</span>
                    <span>{todo.due_date}</span>
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(todo.priority)}`}
              >
                {getPriorityText(todo.priority)}
              </span>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">添加待办事项</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">待办标题</label>
                <input
                  type="text"
                  value={newTodo.title}
                  onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="请输入待办标题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属系统</label>
                <select
                  value={newTodo.service}
                  onChange={(e) => setNewTodo({ ...newTodo, service: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">请选择系统</option>
                  <option value="rs">科研研发</option>
                  <option value="lims">实验室</option>
                  <option value="bi">数据大屏</option>
                  <option value="hrm">人力资源</option>
                  <option value="erp">企业资源</option>
                  <option value="mes">生产执行</option>
                  <option value="wms">仓储管理</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">截止日期</label>
                <input
                  type="date"
                  value={newTodo.due_date}
                  onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                <select
                  value={newTodo.priority}
                  onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodoList;
