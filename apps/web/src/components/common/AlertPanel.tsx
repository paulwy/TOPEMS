import { useState } from 'react';
import { Bell, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, Typography, Badge } from '@mui/material';
import { Button } from '@/components/ui/Button';
import type { AlertLevel } from './AlertCard';
import { AlertCard } from './AlertCard';

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
  onAlertClick?: (_alert: AlertItem) => void;
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

  const filteredAlerts =
    filter === 'all' ? alerts : alerts.filter((alert) => alert.level === filter);

  const levelCounts = {
    all: alerts.length,
    error: alerts.filter((a) => a.level === 'error').length,
    warning: alerts.filter((a) => a.level === 'warning').length,
    success: alerts.filter((a) => a.level === 'success').length,
    info: alerts.filter((a) => a.level === 'info').length,
  };

  return (
    <Card>
      <CardHeader
        sx={{ cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
        action={
          isExpanded ? (
            <ChevronUp sx={{ width: 20, height: 20, color: 'text.secondary' }} />
          ) : (
            <ChevronDown sx={{ width: 20, height: 20, color: 'text.secondary' }} />
          )
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Bell sx={{ width: 20, height: 20, color: 'text.secondary' }} />
            {alerts.length > 0 && (
              <Badge
                sx={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  minWidth: 20,
                  height: 20,
                }}
                color='error'
                badgeContent={alerts.length}
              />
            )}
          </div>
          <div>
            <Typography
              variant='h6'
              sx={{ fontWeight: 'semibold' }}
            >
              数据预警
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              实时监控异常指标
            </Typography>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <Filter sx={{ width: 16, height: 16, color: 'text.secondary' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              {filterOptions.map((option) => (
                <Button
                  key={option.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilter(option.value);
                  }}
                  variant={filter === option.value ? 'contained' : 'outlined'}
                  size='small'
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                  }}
                >
                  {option.label} ({levelCounts[option.value as keyof typeof levelCounts]})
                </Button>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              maxHeight: 320,
              overflowY: 'auto',
              paddingRight: 8,
            }}
          >
            {filteredAlerts.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: 32,
                  color: 'text.secondary',
                }}
              >
                <Bell
                  sx={{
                    width: 48,
                    height: 48,
                    margin: '0 auto 8px',
                    opacity: 0.5,
                  }}
                />
                <Typography variant='body1'>暂无预警信息</Typography>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
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
