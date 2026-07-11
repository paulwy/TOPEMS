export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  content: string;
  userId: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export type NotificationStatus = 'unread' | 'read' | 'archived';
