export interface StatCardData {
  id: string;
  title: string;
  value: string;
  icon: React.ReactNode;
  change: number;
  changeLabel: string;
  color: 'primary' | 'info' | 'success' | 'warning' | 'secondary';
  onClick?: () => void;
}

export interface QuickActionData {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: 'primary' | 'info' | 'success' | 'warning' | 'secondary';
  onClick: () => void;
  description?: string;
}

export interface RecentItemData {
  id: string;
  title: string;
  description: string;
  status: 'success' | 'warning' | 'error' | 'info';
  type: 'chat' | 'code' | 'document' | 'summary';
  onClick: () => void;
}

export interface FeatureCardData {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  stats?: { label: string; value: string }[];
  action?: { label: string; onClick: () => void };
}
