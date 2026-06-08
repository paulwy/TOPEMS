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
      className={`flex items-start gap-3 p-4 rounded-lg border ${config.bgColor} ${config.borderColor} cursor-pointer transition-all hover:shadow-md`}
      onClick={onClick}
    >
      <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <h4 className={`font-medium ${config.titleColor} truncate`}>{title}</h4>
        <p className={`text-sm ${config.messageColor} mt-1`}>{message}</p>
      </div>
    </div>
  );
};

export default AlertCard;
