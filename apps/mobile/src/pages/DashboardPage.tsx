import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  ActivityIndicator,
  Text,
  Avatar,
  Chip,
} from 'react-native-paper';
import { useDashboardStore } from '@/store/dashboardStore';
import { useAuthStore } from '@/store/authStore';
import OfflineIndicator from '@/components/OfflineIndicator';
import {
  Square,
  CheckCircle,
  Calendar,
  LogOut,
  ScanLine,
  ClipboardCheck,
} from 'lucide-react-native';

const DashboardPage: React.FC = () => {
  const { stats, tasks, events, fetchStats, fetchTasks, fetchEvents, isLoading } =
    useDashboardStore();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    fetchStats();
    fetchTasks();
    fetchEvents();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'critical':
        return '#dc2626';
      case 'medium':
        return '#d97706';
      case 'low':
        return '#16a34a';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'in_progress':
        return '进行中';
      case 'pending':
        return '待处理';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Avatar.Text size={48} label={user?.name?.charAt(0) || 'U'} />
          <View>
            <Title style={styles.greeting}>您好, {user?.name}</Title>
            <Paragraph style={styles.role}>{user?.roles?.[0]}</Paragraph>
          </View>
        </View>
        <Button icon={LogOut} mode="outlined" onPress={logout} style={styles.logoutButton}>
          退出
        </Button>
      </View>

      <OfflineIndicator />

      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content>
            <View style={styles.statIcon}>
              <ClipboardCheck size={24} color="#3b82f6" />
            </View>
            <Text style={styles.statValue}>{stats.pendingTasks}</Text>
            <Text style={styles.statLabel}>待处理任务</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <View style={styles.statIcon}>
              <CheckCircle size={24} color="#10b981" />
            </View>
            <Text style={styles.statValue}>{stats.completedTasks}</Text>
            <Text style={styles.statLabel}>已完成任务</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <View style={styles.statIcon}>
              <ScanLine size={24} color="#f59e0b" />
            </View>
            <Text style={styles.statValue}>{stats.todayScans}</Text>
            <Text style={styles.statLabel}>今日扫码</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <View style={styles.statIcon}>
              <Square size={24} color="#8b5cf6" />
            </View>
            <Text style={styles.statValue}>{stats.todayPatrols}</Text>
            <Text style={styles.statLabel}>今日巡检</Text>
          </Card.Content>
        </Card>
      </View>

      <Card style={styles.sectionCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>近期任务</Title>
          <View style={styles.tasksList}>
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <View key={task.id} style={styles.taskItem}>
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.taskDescription}>{task.description || '暂无描述'}</Text>
                    <View style={styles.taskMeta}>
                      <Chip
                        mode="outlined"
                        style={{ backgroundColor: getPriorityColor(task.priority) + '20' }}
                        textStyle={{ color: getPriorityColor(task.priority) }}
                      >
                        {task.priority === 'high' || task.priority === 'critical'
                          ? '高'
                          : task.priority === 'medium'
                            ? '中'
                            : '低'}
                      </Chip>
                      <Chip mode="outlined">{getStatusLabel(task.status)}</Chip>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>暂无任务</Text>
            )}
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>近期活动</Title>
          <View style={styles.eventsList}>
            {events.length > 0 ? (
              events.map((event) => (
                <View key={event.id} style={styles.eventItem}>
                  <View style={styles.eventIcon}>
                    <Calendar size={20} color="#3b82f6" />
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventTime}>{event.startTime}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>暂无活动</Text>
            )}
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#1e3a8a',
    padding: 20,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  greeting: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  role: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  logoutButton: {
    borderColor: 'white',
    borderWidth: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '47%',
    elevation: 2,
  },
  statIcon: {
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    padding: 8,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  sectionCard: {
    margin: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1f2937',
  },
  tasksList: {
    gap: 12,
  },
  taskItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  taskDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  eventsList: {
    gap: 12,
  },
  eventItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  eventIcon: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  eventTime: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 16,
  },
});

export default DashboardPage;
