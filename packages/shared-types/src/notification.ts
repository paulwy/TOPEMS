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
