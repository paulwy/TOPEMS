import React, { useState, useEffect } from 'react';
import { 
  Filter, X, Plus, ChevronDown, ChevronUp,
  Calendar, Search, SlidersHorizontal
} from 'lucide-react';

export interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string | number | boolean;
}

export interface FilterGroup {
  conditions: FilterCondition[];
  operator: 'AND' | 'OR';
}

interface AdvancedFilterProps {
  fields: { key: string; label: string; type: 'text' | 'number' | 'date' | 'select' | 'boolean' }[];
  onApply: (filters: FilterGroup[]) => void;
  onReset: () => void;
  initialFilters?: FilterGroup[];
}

const operators: Record<string, { label: string; value: string }[]> = {
  text: [
    { label: '包含', value: 'contains' },
    { label: '不包含', value: 'not_contains' },
    { label: '等于', value: 'equals' },
    { label: '不等于', value: 'not_equals' },
    { label: '以...开头', value: 'starts_with' },
    { label: '以...结尾', value: 'ends_with' },
    { label: '为空', value: 'is_empty' },
    { label: '不为空', value: 'is_not_empty' },
  ],
  number: [
    { label: '等于', value: 'equals' },
    { label: '不等于', value: 'not_equals' },
    { label: '大于', value: 'greater_than' },
    { label: '小于', value: 'less_than' },
    { label: '大于等于', value: 'greater_than_or_equal' },
    { label: '小于等于', value: 'less_than_or_equal' },
    { label: '为空', value: 'is_empty' },
    { label: '不为空', value: 'is_not_empty' },
  ],
  date: [
    { label: '等于', value: 'equals' },
    { label: '不等于', value: 'not_equals' },
    { label: '大于', value: 'greater_than' },
    { label: '小于', value: 'less_than' },
    { label: '大于等于', value: 'greater_than_or_equal' },
    { label: '小于等于', value: 'less_than_or_equal' },
    { label: '在范围内', value: 'between' },
    { label: '为空', value: 'is_empty' },
    { label: '不为空', value: 'is_not_empty' },
  ],
  select: [
    { label: '等于', value: 'equals' },
    { label: '不等于', value: 'not_equals' },
    { label: '在列表中', value: 'in' },
    { label: '不在列表中', value: 'not_in' },
    { label: '为空', value: 'is_empty' },
    { label: '不为空', value: 'is_not_empty' },
  ],
  boolean: [
    { label: '是', value: 'is_true' },
    { label: '否', value: 'is_false' },
  ],
};

const AdvancedFilter: React.FC<AdvancedFilterProps> = ({ 
  fields, 
  onApply, 
  onReset,
  initialFilters 
}) => {
  const [groups, setGroups] = useState<FilterGroup[]>(initialFilters || [{ conditions: [], operator: 'AND' }]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (initialFilters) {
      setGroups(initialFilters);
    }
  }, [initialFilters]);

  const addCondition = (groupIndex: number) => {
    const newCondition: FilterCondition = {
      id: `condition-${Date.now()}`,
      field: fields[0]?.key || '',
      operator: '',
      value: '',
    };
    const newGroups = [...groups];
    newGroups[groupIndex].conditions.push(newCondition);
    setGroups(newGroups);
    setHasChanges(true);
  };

  const removeCondition = (groupIndex: number, conditionIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex].conditions.splice(conditionIndex, 1);
    setGroups(newGroups);
    setHasChanges(true);
  };

  const updateCondition = (groupIndex: number, conditionIndex: number, field: keyof FilterCondition, value: any) => {
    const newGroups = [...groups];
    newGroups[groupIndex].conditions[conditionIndex][field] = value;
    
    if (field === 'field') {
      const fieldConfig = fields.find(f => f.key === value);
      if (fieldConfig) {
        const defaultOperator = operators[fieldConfig.type]?.[0]?.value || '';
        newGroups[groupIndex].conditions[conditionIndex].operator = defaultOperator;
        newGroups[groupIndex].conditions[conditionIndex].value = '';
      }
    }
    
    setGroups(newGroups);
    setHasChanges(true);
  };

  const addGroup = () => {
    setGroups([...groups, { conditions: [], operator: 'AND' }]);
    setHasChanges(true);
  };

  const removeGroup = (groupIndex: number) => {
    if (groups.length > 1) {
      const newGroups = groups.filter((_, i) => i !== groupIndex);
      setGroups(newGroups);
      setHasChanges(true);
    }
  };

  const updateGroupOperator = (groupIndex: number, operator: 'AND' | 'OR') => {
    const newGroups = [...groups];
    newGroups[groupIndex].operator = operator;
    setGroups(newGroups);
    setHasChanges(true);
  };

  const getFieldType = (fieldKey: string): 'text' | 'number' | 'date' | 'select' | 'boolean' => {
    return fields.find(f => f.key === fieldKey)?.type || 'text';
  };

  const handleApply = () => {
    const validGroups = groups.filter(g => g.conditions.length > 0);
    onApply(validGroups);
    setHasChanges(false);
  };

  const handleReset = () => {
    setGroups([{ conditions: [], operator: 'AND' }]);
    setHasChanges(false);
    onReset();
  };

  const getConditionCount = () => {
    return groups.reduce((count, group) => count + group.conditions.length, 0);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center">
          <SlidersHorizontal className="w-5 h-5 mr-2 text-gray-600" />
          <span className="font-medium text-gray-700">高级筛选</span>
          {getConditionCount() > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {getConditionCount()} 条件
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Filter Groups */}
          {groups.map((group, groupIndex) => (
            <div key={groupIndex} className="border border-gray-200 rounded-lg p-4">
              {/* Group Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-sm text-gray-600 mr-2">条件组 {groupIndex + 1}</span>
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => updateGroupOperator(groupIndex, 'AND')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        group.operator === 'AND'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      AND
                    </button>
                    <button
                      onClick={() => updateGroupOperator(groupIndex, 'OR')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        group.operator === 'OR'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      OR
                    </button>
                  </div>
                </div>
                {groups.length > 1 && (
                  <button
                    onClick={() => removeGroup(groupIndex)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="删除条件组"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Conditions */}
              <div className="space-y-3">
                {group.conditions.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    点击下方按钮添加筛选条件
                  </div>
                ) : (
                  group.conditions.map((condition, conditionIndex) => (
                    <div key={condition.id} className="flex items-center space-x-2">
                      {/* Field */}
                      <select
                        value={condition.field}
                        onChange={(e) => updateCondition(groupIndex, conditionIndex, 'field', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="">选择字段</option>
                        {fields.map(field => (
                          <option key={field.key} value={field.key}>
                            {field.label}
                          </option>
                        ))}
                      </select>

                      {/* Operator */}
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(groupIndex, conditionIndex, 'operator', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="">选择操作符</option>
                        {operators[getFieldType(condition.field)]?.map(op => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>

                      {/* Value */}
                      <div className="flex-1">
                        {condition.operator === 'is_empty' || condition.operator === 'is_not_empty' ? (
                          <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-500 text-sm">
                            无需输入值
                          </div>
                        ) : condition.operator === 'between' && getFieldType(condition.field) === 'date' ? (
                          <div className="flex space-x-2">
                            <input
                              type="date"
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              placeholder="开始日期"
                            />
                            <span className="flex items-center text-gray-500">至</span>
                            <input
                              type="date"
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              placeholder="结束日期"
                            />
                          </div>
                        ) : getFieldType(condition.field) === 'date' ? (
                          <input
                            type="date"
                            value={condition.value as string}
                            onChange={(e) => updateCondition(groupIndex, conditionIndex, 'value', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        ) : getFieldType(condition.field) === 'number' ? (
                          <input
                            type="number"
                            value={condition.value as number}
                            onChange={(e) => updateCondition(groupIndex, conditionIndex, 'value', parseFloat(e.target.value) || '')}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        ) : getFieldType(condition.field) === 'boolean' ? (
                          <select
                            value={String(condition.value)}
                            onChange={(e) => updateCondition(groupIndex, conditionIndex, 'value', e.target.value === 'true')}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          >
                            <option value="">选择</option>
                            <option value="true">是</option>
                            <option value="false">否</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={condition.value as string}
                            onChange={(e) => updateCondition(groupIndex, conditionIndex, 'value', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="输入值"
                          />
                        )}
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeCondition(groupIndex, conditionIndex)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="删除条件"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Condition Button */}
              <button
                onClick={() => addCondition(groupIndex)}
                className="mt-3 w-full flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加条件
              </button>
            </div>
          ))}

          {/* Add Group Button */}
          <button
            onClick={addGroup}
            className="w-full flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            添加条件组（OR 逻辑）
          </button>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              重置
            </button>
            <button
              onClick={handleApply}
              disabled={getConditionCount() === 0}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Filter className="w-4 h-4 mr-2" />
              应用筛选
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilter;
