import { AlertTriangle, AlertCircle, CheckCircle, AlertOctagon } from 'lucide-react';

export type AlertLevel = 'success' | 'warning' | 'error' | 'info';

interface AlertCardProps {
  title: string;
  message: string;
  level: AlertLevel;
  onClick?: () => void;
}

const levelConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-500',
    titleColor: 'text-green-800',
    messageColor: 'text-green-600',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-500',
    titleColor: 'text-amber-800',
    messageColor: 'text-amber-600',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    titleColor: 'text-red-800',
    messageColor: 'text-red-600',
  },
  info: {
    icon: AlertOctagon,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-800',
    messageColor: 'text-blue-600',
  },
};

export const AlertCard = ({ title, message, level, onClick }: AlertCardProps) => {
  const config = levelConfig[level];
  const Icon = config.icon;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        ...(level === 'success'
          ? { backgroundColor: 'success.light', borderColor: 'success.light' }
          : {}),
        ...(level === 'warning'
          ? { backgroundColor: 'warning.light', borderColor: 'warning.light' }
          : {}),
        ...(level === 'error' ? { backgroundColor: 'error.light', borderColor: 'error.light' } : {}),
        ...(level === 'info' ? { backgroundColor: 'primary.light', borderColor: 'primary.light' } : {}),
      }}
      onClick={onClick}
    >
      <Icon
        sx={{
          width: 20,
          height: 20,
          flexShrink: 0,
          marginTop: '2px',
          ...(level === 'success' ? { color: 'success.dark' } : {}),
          ...(level === 'warning' ? { color: 'warning.main' } : {}),
          ...(level === 'error' ? { color: 'error.main' } : {}),
          ...(level === 'info' ? { color: 'primary.main' } : {}),
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4
          style={{
            fontWeight: 500,
            ...(level === 'success' ? { color: '#166534' } : {}),
            ...(level === 'warning' ? { color: '#92400e' } : {}),
            ...(level === 'error' ? { color: '#991b1b' } : {}),
            ...(level === 'info' ? { color: '#1e40af' } : {}),
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </h4>
        <p
          style={{
            fontSize: '14px',
            ...(level === 'success' ? { color: '#15803d' } : {}),
            ...(level === 'warning' ? { color: '#b45309' } : {}),
            ...(level === 'error' ? { color: 'error.darker' } : {}),
            ...(level === 'info' ? { color: 'primary.dark' } : {}),
            marginTop: '4px',
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
};

export default AlertCard;
