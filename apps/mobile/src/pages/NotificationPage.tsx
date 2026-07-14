import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Card, IconButton, Divider, Badge } from 'react-native-paper';
import { notificationApi } from '@/api/notification';
import type { Notification } from '@/types';
import { Bell, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react-native';

const NotificationPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await notificationApi.getNotifications({ page: 1, pageSize: 20 });
      if (response.success && response.data) {
        setNotifications(response.data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} color="#10b981" />;
      case 'warning':
        return <AlertCircle size={20} color="#f59e0b" />;
      case 'error':
        return <XCircle size={20} color="#ef4444" />;
      default:
        return <Info size={20} color="#3b82f6" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours}小时前`;

    const days = Math.floor(hours / 24);
    return `${days}天前`;
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <Card
      style={[
        styles.notificationCard,
        !item.isRead && styles.unreadNotification,
      ]}
      mode="elevated"
    >
      <Card.Content style={styles.notificationContent}>
        <View style={styles.notificationIcon}>
          {getNotificationIcon(item.type)}
        </View>
        <View style={styles.notificationBody}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, !item.isRead && styles.unreadText]}>
              {item.title}
            </Text>
            <Text style={styles.notificationTime}>{formatDate(item.createdAt)}</Text>
          </View>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          {item.module && (
            <Badge style={styles.moduleBadge}>{item.module}</Badge>
          )}
        </View>
        {!item.isRead && (
          <TouchableOpacity
            onPress={() => handleMarkAsRead(item.id)}
            style={styles.markReadButton}
          >
            <IconButton icon="check" size={18} color="#3b82f6" />
          </TouchableOpacity>
        )}
      </Card.Content>
    </Card>
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Bell size={24} color="#3b82f6" />
          <Text style={styles.headerTitle}>消息通知</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>全部已读</Text>
          </TouchableOpacity>
        )}
      </View>
      <Divider />
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text>加载中...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchNotifications} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Bell size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>暂无通知</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  markAllButton: {
    padding: 8,
  },
  markAllText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  notificationCard: {
    borderRadius: 12,
  },
  unreadNotification: {
    backgroundColor: '#eff6ff',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notificationIcon: {
    marginTop: 4,
  },
  notificationBody: {
    flex: 1,
    gap: 4,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  unreadText: {
    fontWeight: '700',
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  moduleBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  markReadButton: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
});

export default NotificationPage;
