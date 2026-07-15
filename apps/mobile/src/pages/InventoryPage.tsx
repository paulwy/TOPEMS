import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { Text, Card, Divider, Badge, FAB } from 'react-native-paper';
import { inventoryApi } from '@/api/inventory';
import type { InventoryItem } from '@/types';
import { Package, Search, AlertTriangle, Plus, Minus } from 'lucide-react-native';

const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const [itemsResponse, lowStockResponse] = await Promise.all([
        inventoryApi.getItems({ page: 1, pageSize: 30, search: searchQuery }),
        inventoryApi.getLowStockItems(),
      ]);

      if (itemsResponse.success && itemsResponse.data) {
        setItems(itemsResponse.data.items || []);
      }
      if (lowStockResponse.success) {
        setLowStockItems(lowStockResponse.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [searchQuery]);

  const handleSearch = () => {
    fetchItems();
  };

  const handleQuantityChange = async (id: string, delta: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const newQuantity = item.quantity + delta;
    if (newQuantity < 0) {
      Alert.alert('提示', '库存数量不能为负数');
      return;
    }

    try {
      await inventoryApi.updateItem(id, { quantity: newQuantity });
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: newQuantity } : i)));
      if (delta < 0 && lowStockItems.find((i) => i.id === id)) {
        fetchItems();
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
      Alert.alert('错误', '更新库存失败');
    }
  };

  const isLowStock = (item: InventoryItem) => {
    return lowStockItems.some((i) => i.id === item.id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const lowStock = isLowStock(item);

    return (
      <Card style={[styles.itemCard, lowStock && styles.lowStockCard]} mode="elevated">
        <Card.Content style={styles.itemContent}>
          <View style={styles.itemIcon}>
            <Package size={28} color={lowStock ? '#ef4444' : '#3b82f6'} />
          </View>
          <View style={styles.itemBody}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemCode}>{item.code}</Text>
              <Text style={styles.itemUpdateTime}>{formatDate(item.updatedAt)}</Text>
            </View>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={styles.itemMeta}>
              <Badge style={styles.categoryBadge}>{item.category}</Badge>
              <Text style={styles.itemLocation}>{item.location}</Text>
            </View>
          </View>
          <View style={styles.itemQuantityContainer}>
            <View style={styles.quantityControl}>
              <TouchableOpacity
                onPress={() => handleQuantityChange(item.id, -1)}
                style={styles.quantityButton}
              >
                <Minus size={16} color="#6b7280" />
              </TouchableOpacity>
              <Text style={[styles.quantityText, lowStock && styles.lowStockText]}>
                {item.quantity} {item.unit}
              </Text>
              <TouchableOpacity
                onPress={() => handleQuantityChange(item.id, 1)}
                style={styles.quantityButton}
              >
                <Plus size={16} color="#3b82f6" />
              </TouchableOpacity>
            </View>
            {lowStock && (
              <View style={styles.lowStockWarning}>
                <AlertTriangle size={14} color="#ef4444" />
                <Text style={styles.lowStockText}>库存不足</Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Package size={24} color="#3b82f6" />
          <Text style={styles.headerTitle}>库存管理</Text>
        </View>
        <Badge style={styles.lowStockBadge}>
          {lowStockItems.length > 0 ? lowStockItems.length : 0}
        </Badge>
      </View>
      <Divider />
      <View style={styles.searchContainer}>
        <Search size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="搜索物料编码或名称"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
      </View>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text>加载中...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchItems} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>暂无库存数据</Text>
            </View>
          }
        />
      )}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => Alert.alert('提示', '新建库存功能开发中')}
      />
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
  lowStockBadge: {
    backgroundColor: '#ef4444',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 80,
  },
  itemCard: {
    borderRadius: 12,
  },
  lowStockCard: {
    backgroundColor: '#fef2f2',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemIcon: {
    padding: 4,
  },
  itemBody: {
    flex: 1,
    gap: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCode: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  itemUpdateTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    fontSize: 11,
  },
  itemLocation: {
    fontSize: 13,
    color: '#6b7280',
  },
  itemQuantityContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
    padding: 4,
    borderRadius: 8,
  },
  quantityButton: {
    padding: 4,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    minWidth: 60,
    textAlign: 'center',
  },
  lowStockText: {
    color: '#ef4444',
    fontSize: 12,
  },
  lowStockWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#3b82f6',
  },
});

export default InventoryPage;
