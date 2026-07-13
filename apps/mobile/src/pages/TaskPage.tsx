import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  Chip,
  Searchbar,
  Text,
} from 'react-native-paper';
import { taskApi } from '@/api/task';
import type { Task } from '@/types';
import {
  Square,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react-native';

const TaskPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [_total, setTotal] = useState(0);

  useEffect(() => {
    fetchTasks();
  }, [statusFilter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await taskApi.getTasks({
        page,
        pageSize: 20,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      if (response.success && response.data) {
        setTasks(response.data.items);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchTasks();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#16a34a';
      case 'in_progress':
        return '#2563eb';
      case 'pending':
        return '#d97706';
      case 'cancelled':
        return '#6b7280';
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#d97706';
      case 'low':
        return '#16a34a';
      default:
        return '#6b7280';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '紧急';
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return priority;
    }
  };

  const renderItem = ({ item }: { item: Task }) => (
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Square size={18} color="#2563eb" style={styles.titleIcon} />
            <Title style={styles.cardTitle}>{item.title}</Title>
          </View>
          <Chip
            textStyle={{ fontSize: 10, fontWeight: '600' }}
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
          >
            <Text style={{ color: getStatusColor(item.status), fontSize: 10, fontWeight: '600' }}>
              {getStatusLabel(item.status)}
            </Text>
          </Chip>
        </View>

        {item.description ? (
          <Paragraph style={styles.description} numberOfLines={2}>
            {item.description}
          </Paragraph>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.metaItem}>
            <Clock size={14} color="#9ca3af" />
            <Text style={styles.metaText}>
              {item.dueDate || '无截止日期'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <AlertCircle size={14} color={getPriorityColor(item.priority)} />
            <Text style={[styles.metaText, { color: getPriorityColor(item.priority) }]}>
              {getPriorityLabel(item.priority)}优先级
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="搜索任务..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <View style={styles.filterContainer}>
        <ScrollableFilter
          options={[
            { key: 'all', label: '全部' },
            { key: 'pending', label: '待处理' },
            { key: 'in_progress', label: '进行中' },
            { key: 'completed', label: '已完成' },
          ]}
          active={statusFilter}
          onPress={setStatusFilter}
        />
      </View>

      <FlatList
        data={tasks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <CheckCircle size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>暂无任务</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  );
};

const ScrollableFilter: React.FC<{
  options: { key: string; label: string }[];
  active: string;
  onPress: (key: string) => void;
}> = ({ options, active, onPress }) => (
  <FlatList
    horizontal
    showsHorizontalScrollIndicator={false}
    data={options}
    keyExtractor={(item) => item.key}
    renderItem={({ item }) => (
      <TouchableOpacity
        style={[
          styles.filterButton,
          active === item.key && styles.filterButtonActive,
        ]}
        onPress={() => onPress(item.key)}
      >
        <Text
          style={[
            styles.filterButtonText,
            active === item.key && styles.filterButtonTextActive,
          ]}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    )}
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  searchBar: {
    margin: 12,
    marginBottom: 8,
    elevation: 2,
  },
  filterContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 12,
    paddingTop: 4,
  },
  card: {
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusChip: {
    height: 24,
  },
  description: {
    color: '#6b7280',
    fontSize: 13,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 12,
  },
});

export default TaskPage;
