import { designTokens } from '@topems/tokens';
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  ActivityIndicator,
  Chip,
  Text,
  Button,
  Divider,
  IconButton,
} from 'react-native-paper';
import { inventoryApi } from '@/api/inventory';
import type { InventoryItem } from '@/types';
import {
  Package,
  MapPin,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  Minus,
} from 'lucide-react-native';
import { zh } from '../i18n/zh';

type InventoryDetailPageProps = {
  route: {
    params: {
      id: string;
    };
  };
  navigation: {
    goBack: () => void;
  };
};

const InventoryDetailPage: React.FC<InventoryDetailPageProps> = ({ route, navigation }) => {
  const { id } = route.params;
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLowStock, setIsLowStock] = useState(false);

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const [itemResponse, lowStockResponse] = await Promise.all([
        inventoryApi.getItemById(id),
        inventoryApi.getLowStockItems(),
      ]);

      if (itemResponse.success && itemResponse.data) {
        setItem(itemResponse.data);
      }
      if (lowStockResponse.success && lowStockResponse.data) {
        setIsLowStock(lowStockResponse.data.some((i) => i.id === id));
      }
    } catch (error) {
      console.error('Failed to fetch inventory item:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchItem();
  };

  const handleQuantityChange = async (delta: number) => {
    if (!item) return;

    const newQuantity = item.quantity + delta;
    if (newQuantity < 0) {
      Alert.alert(zh['common.alertHint'], zh['common.negativeQty']);
      return;
    }

    try {
      const response = await inventoryApi.updateItem(id, { quantity: newQuantity });
      if (response.success && response.data) {
        setItem(response.data);
        fetchItem();
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
      Alert.alert(zh['common.error'], zh['common.updateInventoryFailed']);
    }
  };

  const handleDelete = () => {
    Alert.alert(zh['common.confirmDelete'], zh['inventory.deleteConfirmMsg'], [
      { text: zh['common.cancel'], style: 'cancel' },
      {
        text: zh['common.confirm'],
        style: 'destructive',
        onPress: async () => {
          try {
            await inventoryApi.deleteItem(id);
            navigation.goBack();
          } catch (error) {
            console.error('Failed to delete inventory:', error);
            Alert.alert(zh['common.error'], zh['common.deleteFailed']);
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating size="large" color={designTokens.colors.blue[500]} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon={() => <ArrowLeft size={24} color={designTokens.colors.common.white} />}
            onPress={() => navigation.goBack()}
          />
          <Title style={styles.headerTitle}>{zh['inventory.detailTitle']}</Title>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Package size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>{zh['inventory.notFound']}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <IconButton
          icon={() => <ArrowLeft size={24} color={designTokens.colors.common.white} />}
          onPress={() => navigation.goBack()}
        />
        <Title style={styles.headerTitle}>{zh['inventory.detailTitle']}</Title>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        <Card style={[styles.mainCard, isLowStock && styles.lowStockCard]} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Package
                  size={32}
                  color={
                    isLowStock ? designTokens.colors.error[500] : designTokens.colors.blue[500]
                  }
                />
              </View>
              <View style={styles.titleSection}>
                <Title style={styles.itemName}>{item.name}</Title>
                <Text style={styles.itemCode}>{item.code}</Text>
              </View>
              <Chip
                textStyle={{ fontSize: 11, fontWeight: '600' }}
                style={[
                  styles.statusChip,
                  { backgroundColor: isLowStock ? '#ef444420' : '#16a34a20' },
                ]}
              >
                <Text
                  style={{
                    color: isLowStock
                      ? designTokens.colors.error[500]
                      : designTokens.colors.success[600],
                    fontSize: 11,
                    fontWeight: '600',
                  }}
                >
                  {isLowStock
                    ? zh['common.lowStock']
                    : item.status === 'active'
                      ? zh['common.statusNormal']
                      : item.status}
                </Text>
              </Chip>
            </View>

            {isLowStock && (
              <View style={styles.warningBanner}>
                <AlertTriangle size={16} color={designTokens.colors.error[500]} />
                <Text style={styles.warningText}>{zh['inventory.lowStockWarning']}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.infoCard} mode="elevated">
          <Card.Content>
            <Title style={styles.sectionTitle}>{zh['inventory.quantity']}</Title>
            <View style={styles.quantitySection}>
              <TouchableOpacity
                onPress={() => handleQuantityChange(-1)}
                style={styles.quantityButton}
              >
                <Minus size={20} color="#6b7280" />
              </TouchableOpacity>
              <View style={styles.quantityDisplay}>
                <Text style={[styles.quantityNumber, isLowStock && styles.lowStockNumber]}>
                  {item.quantity}
                </Text>
                <Text style={styles.quantityUnit}>{item.unit}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleQuantityChange(1)}
                style={styles.quantityButton}
              >
                <Plus size={20} color={designTokens.colors.blue[500]} />
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.infoCard} mode="elevated">
          <Card.Content>
            <Title style={styles.sectionTitle}>{zh['inventory.detailInfo']}</Title>
            <View style={styles.infoGrid}>
              <View style={styles.infoRow}>
                <MapPin size={16} color={designTokens.colors.blue[500]} />
                <Text style={styles.infoLabel}>{zh['inventory.location']}</Text>
                <Text style={styles.infoValue}>{item.location}</Text>
              </View>
              <View style={styles.infoRow}>
                <Package size={16} color={designTokens.colors.blue[500]} />
                <Text style={styles.infoLabel}>{zh['inventory.category']}</Text>
                <Text style={styles.infoValue}>{item.category}</Text>
              </View>
              <Divider style={styles.divider} />
              <View style={styles.infoRow}>
                <Calendar size={16} color="#9ca3af" />
                <Text style={styles.infoLabel}>{zh['common.createdAt']}</Text>
                <Text style={styles.infoValue}>{formatDate(item.createdAt)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Calendar size={16} color="#9ca3af" />
                <Text style={styles.infoLabel}>{zh['common.updatedAt']}</Text>
                <Text style={styles.infoValue}>{formatDate(item.updatedAt)}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            style={styles.actionButton}
            icon={() => <Edit size={16} />}
            onPress={() => Alert.alert(zh['common.alertHint'], zh['common.editInDevelopment'])}
          >
            {zh['common.edit']}
          </Button>
          <Button
            mode="contained"
            style={[styles.actionButton, styles.deleteButton]}
            icon={() => <Trash2 size={16} />}
            onPress={handleDelete}
          >
            {zh['common.delete']}
          </Button>
        </View>
      </View>
    </ScrollView>
  );
};

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: designTokens.colors.blue[500],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: designTokens.colors.common.white,
  },
  headerPlaceholder: {
    width: 48,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  mainCard: {
    borderRadius: 16,
    marginBottom: 12,
  },
  lowStockCard: {
    backgroundColor: designTokens.colors.error[50],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  titleSection: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 20,
    fontWeight: '700',
  },
  itemCode: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusChip: {
    height: 28,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: designTokens.colors.error[50],
    borderRadius: 8,
  },
  warningText: {
    fontSize: 13,
    color: designTokens.colors.error[500],
    fontWeight: '500',
  },
  infoCard: {
    borderRadius: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  quantitySection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingVertical: 16,
  },
  quantityButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  quantityDisplay: {
    alignItems: 'center',
    gap: 4,
  },
  quantityNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
  },
  lowStockNumber: {
    color: designTokens.colors.error[500],
  },
  quantityUnit: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6b7280',
    width: 70,
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    flex: 1,
  },
  divider: {
    marginVertical: 8,
    backgroundColor: '#e5e7eb',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    height: 48,
  },
  deleteButton: {
    backgroundColor: designTokens.colors.error[600],
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

export default InventoryDetailPage;
