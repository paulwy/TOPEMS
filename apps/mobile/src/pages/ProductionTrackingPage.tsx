import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Card, Title, ActivityIndicator, Chip, Text, Button, Searchbar } from 'react-native-paper';
import { productionApi } from '@/api/production';
import type { ProductionOrder } from '@/types';
import { Factory, Play, CheckCircle, XCircle, Clock, Package } from 'lucide-react-native';

const ProductionTrackingPage: React.FC = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await productionApi.getOrders({
        page: 1,
        pageSize: 20,
        status: statusFilter === 'all' ? undefined : statusFilter,
        productName: searchQuery || undefined,
      });
      if (response.success && response.data) {
        setOrders(response.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch production orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleSearch = () => {
    fetchOrders();
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
        return '生产中';
      case 'pending':
        return '待生产';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} color="#16a34a" />;
      case 'in_progress':
        return <Play size={16} color="#2563eb" />;
      case 'pending':
        return <Clock size={16} color="#d97706" />;
      case 'cancelled':
        return <XCircle size={16} color="#6b7280" />;
      default:
        return <Clock size={16} color="#6b7280" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const handleStartOrder = async (order: ProductionOrder) => {
    Alert.alert('确认开始', `确定要开始生产订单 ${order.code} 吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: async () => {
          try {
            const response = await productionApi.startOrder(order.id);
            if (response.success) {
              fetchOrders();
            }
          } catch (error) {
            console.error('Failed to start order:', error);
            Alert.alert('错误', '启动生产失败');
          }
        },
      },
    ]);
  };

  const handleCompleteOrder = async (order: ProductionOrder) => {
    Alert.alert('确认完成', `确定要完成生产订单 ${order.code} 吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: async () => {
          try {
            const response = await productionApi.completeOrder(order.id);
            if (response.success) {
              fetchOrders();
            }
          } catch (error) {
            console.error('Failed to complete order:', error);
            Alert.alert('错误', '完成生产失败');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: ProductionOrder }) => (
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.typeContainer}>
            <Factory size={18} color="#2563eb" />
            <Text style={styles.orderCode}>{item.code}</Text>
          </View>
          <Chip
            textStyle={{ fontSize: 11, fontWeight: '600' }}
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
          >
            <Text style={{ color: getStatusColor(item.status), fontSize: 11, fontWeight: '600' }}>
              {getStatusLabel(item.status)}
            </Text>
          </Chip>
        </View>

        <Title style={styles.title}>{item.productName}</Title>

        <View style={styles.cardBody}>
          <View style={styles.quantitySection}>
            <Package size={16} color="#6b7280" />
            <Text style={styles.quantityText}>
              计划产量: <Text style={styles.quantityValue}>{item.quantity}</Text>
            </Text>
          </View>
          <View style={styles.dateSection}>
            <Clock size={14} color="#9ca3af" />
            <Text style={styles.dateText}>
              {formatDate(item.startDate)} - {formatDate(item.endDate)}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.statusIconContainer}>
            {getStatusIcon(item.status)}
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
          <View style={styles.actionButtons}>
            {item.status === 'pending' && (
              <Button
                mode="contained"
                style={styles.actionButton}
                icon={() => <Play size={14} color="#fff" />}
                onPress={() => handleStartOrder(item)}
              >
                开始
              </Button>
            )}
            {item.status === 'in_progress' && (
              <Button
                mode="contained"
                style={[styles.actionButton, { backgroundColor: '#16a34a' }]}
                icon={() => <CheckCircle size={14} color="#fff" />}
                onPress={() => handleCompleteOrder(item)}
              >
                完成
              </Button>
            )}
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
        placeholder="搜索产品名称..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        onSubmitEditing={handleSearch}
        style={styles.searchBar}
      />

      <View style={styles.filterContainer}>
        <ScrollableFilter
          options={[
            { key: 'all', label: '全部' },
            { key: 'pending', label: '待生产' },
            { key: 'in_progress', label: '生产中' },
            { key: 'completed', label: '已完成' },
          ]}
          active={statusFilter}
          onPress={setStatusFilter}
        />
      </View>

      <FlatList
        data={orders}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Factory size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>暂无生产订单</Text>
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
        style={[styles.filterButton, active === item.key && styles.filterButtonActive]}
        onPress={() => onPress(item.key)}
      >
        <Text
          style={[styles.filterButtonText, active === item.key && styles.filterButtonTextActive]}
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
    alignItems: 'center',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderCode: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
    marginLeft: 6,
  },
  statusChip: {
    height: 26,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  cardBody: {
    gap: 8,
    marginBottom: 12,
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quantityText: {
    fontSize: 13,
    color: '#6b7280',
  },
  quantityValue: {
    fontWeight: '600',
    color: '#1f2937',
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statusIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#6b7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    borderRadius: 8,
    height: 36,
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

export default ProductionTrackingPage;
