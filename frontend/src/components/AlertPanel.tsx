import { useState } from 'react';
import { Bell, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { AlertCard, AlertLevel } from './AlertCard';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  level: AlertLevel;
  module: string;
  timestamp: string;
}

interface AlertPanelProps {
  alerts: AlertItem[];
  onAlertClick?: (alert: AlertItem) => void;
}

const filterOptions = [
  { value: 'all', label: '全部' },
  { value: 'error', label: '错误' },
  { value: 'warning', label: '警告' },
  { value: 'success', label: '成功' },
  { value: 'info', label: '信息' },
];

export const AlertPanel = ({ alerts, onAlertClick }: AlertPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filter, setFilter] = useState('all');

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(alert => alert.level === filter);

  const levelCounts = {
    all: alerts.length,
    error: alerts.filter(a => a.level === 'error').length,
    warning: alerts.filter(a => a.level === 'warning').length,
    success: alerts.filter(a => a.level === 'success').length,
    info: alerts.filter(a => a.level === 'info').length,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-5 h-5 text-gray-600" />
            {alerts.length > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                {alerts.length}
              </Badge>
            )}
          </div>
          <div>
            <CardTitle className="text-base font-semibold">数据预警</CardTitle>
            <p className="text-sm text-gray-500">实时监控异常指标</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="flex gap-2">
              {filterOptions.map(option => (
                <button
                  key={option.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilter(option.value);
                  }}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    filter === option.value
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {option.label} ({levelCounts[option.value as keyof typeof levelCounts]})
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无预警信息</p>
              </div>
            ) : (
              filteredAlerts.map(alert => (
                <AlertCard
                  key={alert.id}
                  title={alert.title}
                  message={alert.message}
                  level={alert.level}
                  onClick={() => onAlertClick?.(alert)}
                />
              ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AlertPanel;
