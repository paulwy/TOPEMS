import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
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
import { customerApi } from '@/api/customer';
import type { Customer } from '@/types';
import {
  Users,
  MapPin,
  Phone,
  Mail,
  Building2,
  Calendar,
  ArrowLeft,
  Edit,
  Trash2,
} from 'lucide-react-native';

type CustomerDetailPageProps = {
  route: {
    params: {
      id: string;
    };
  };
  navigation: {
    goBack: () => void;
  };
};

const CustomerDetailPage: React.FC<CustomerDetailPageProps> = ({ route, navigation }) => {
  const { id } = route.params;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const response = await customerApi.getCustomerById(id);
      if (response.success && response.data) {
        setCustomer(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch customer:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCustomer();
  };

  const handleDelete = () => {
    Alert.alert('确认删除', '确定要删除此客户吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: async () => {
          try {
            await customerApi.deleteCustomer(id);
            navigation.goBack();
          } catch (error) {
            console.error('Failed to delete customer:', error);
            Alert.alert('错误', '删除失败');
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

  const getStatusColor = (status: string) => {
    return status === 'active' ? '#16a34a' : '#6b7280';
  };

  const getStatusLabel = (status: string) => {
    return status === 'active' ? '正常' : '停用';
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon={() => <ArrowLeft size={24} color="#fff" />}
            onPress={() => navigation.goBack()}
          />
          <Title style={styles.headerTitle}>客户详情</Title>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Users size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>客户不存在</Text>
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
          icon={() => <ArrowLeft size={24} color="#fff" />}
          onPress={() => navigation.goBack()}
        />
        <Title style={styles.headerTitle}>客户详情</Title>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        <Card style={styles.mainCard} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Users size={32} color="#3b82f6" />
              </View>
              <View style={styles.titleSection}>
                <Title style={styles.customerName}>{customer.name}</Title>
                <Text style={styles.customerCode}>{customer.code || '未设置编码'}</Text>
              </View>
              <Chip
                textStyle={{ fontSize: 11, fontWeight: '600' }}
                style={[
                  styles.statusChip,
                  { backgroundColor: getStatusColor(customer.status) + '20' },
                ]}
              >
                <Text
                  style={{
                    color: getStatusColor(customer.status),
                    fontSize: 11,
                    fontWeight: '600',
                  }}
                >
                  {getStatusLabel(customer.status)}
                </Text>
              </Chip>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.infoCard} mode="elevated">
          <Card.Content>
            <Title style={styles.sectionTitle}>联系信息</Title>
            <View style={styles.infoGrid}>
              {customer.contactName && (
                <View style={styles.infoRow}>
                  <Users size={16} color="#3b82f6" />
                  <Text style={styles.infoLabel}>联系人</Text>
                  <Text style={styles.infoValue}>{customer.contactName}</Text>
                </View>
              )}
              {customer.contactPhone && (
                <View style={styles.infoRow}>
                  <Phone size={16} color="#3b82f6" />
                  <Text style={styles.infoLabel}>联系电话</Text>
                  <Text style={styles.infoValue}>{customer.contactPhone}</Text>
                </View>
              )}
              {customer.contactEmail && (
                <View style={styles.infoRow}>
                  <Mail size={16} color="#3b82f6" />
                  <Text style={styles.infoLabel}>邮箱</Text>
                  <Text style={styles.infoValue}>{customer.contactEmail}</Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.infoCard} mode="elevated">
          <Card.Content>
            <Title style={styles.sectionTitle}>地址信息</Title>
            <View style={styles.infoGrid}>
              {customer.province && (
                <View style={styles.infoRow}>
                  <MapPin size={16} color="#3b82f6" />
                  <Text style={styles.infoLabel}>省份</Text>
                  <Text style={styles.infoValue}>{customer.province}</Text>
                </View>
              )}
              {customer.city && (
                <View style={styles.infoRow}>
                  <MapPin size={16} color="#3b82f6" />
                  <Text style={styles.infoLabel}>城市</Text>
                  <Text style={styles.infoValue}>{customer.city}</Text>
                </View>
              )}
              {customer.address && (
                <View style={styles.infoRow}>
                  <MapPin size={16} color="#3b82f6" />
                  <Text style={styles.infoLabel}>详细地址</Text>
                  <Text style={styles.infoValue}>{customer.address}</Text>
                </View>
              )}
              {customer.postalCode && (
                <View style={styles.infoRow}>
                  <MapPin size={16} color="#3b82f6" />
                  <Text style={styles.infoLabel}>邮编</Text>
                  <Text style={styles.infoValue}>{customer.postalCode}</Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.infoCard} mode="elevated">
          <Card.Content>
            <Title style={styles.sectionTitle}>其他信息</Title>
            <View style={styles.infoGrid}>
              {customer.industry && (
                <View style={styles.infoRow}>
                  <Building2 size={16} color="#3b82f6" />
                  <Text style={styles.infoLabel}>所属行业</Text>
                  <Text style={styles.infoValue}>{customer.industry}</Text>
                </View>
              )}
              <Divider style={styles.divider} />
              <View style={styles.infoRow}>
                <Calendar size={16} color="#9ca3af" />
                <Text style={styles.infoLabel}>创建时间</Text>
                <Text style={styles.infoValue}>{formatDate(customer.createdAt)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Calendar size={16} color="#9ca3af" />
                <Text style={styles.infoLabel}>更新时间</Text>
                <Text style={styles.infoValue}>{formatDate(customer.updatedAt)}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            style={styles.actionButton}
            icon={() => <Edit size={16} />}
            onPress={() => Alert.alert('提示', '编辑功能开发中')}
          >
            编辑
          </Button>
          <Button
            mode="contained"
            style={[styles.actionButton, styles.deleteButton]}
            icon={() => <Trash2 size={16} />}
            onPress={handleDelete}
          >
            删除
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
    backgroundColor: '#3b82f6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
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
  customerName: {
    fontSize: 20,
    fontWeight: '700',
  },
  customerCode: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusChip: {
    height: 28,
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
    backgroundColor: '#dc2626',
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

export default CustomerDetailPage;
