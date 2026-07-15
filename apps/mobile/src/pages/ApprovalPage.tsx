import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  Chip,
  Text,
  Button,
  Avatar,
  Dialog,
  Portal,
  TextInput,
} from 'react-native-paper';
import { approvalApi } from '@/api/approval';
import type { Approval } from '@/types';
import { ClipboardCheck, User, Clock, CheckCircle, XCircle, FileText } from 'lucide-react-native';

const ApprovalPage: React.FC = () => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [visible, setVisible] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, [statusFilter]);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const response = await approvalApi.getApprovals({
        status: statusFilter,
        pageSize: 20,
      });
      if (response.success && response.data) {
        setApprovals(response.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchApprovals();
  };

  const showDetail = (approval: Approval) => {
    setSelectedApproval(approval);
    setComment('');
    setVisible(true);
  };

  const handleApprove = async () => {
    if (!selectedApproval) return;
    setActionLoading(true);
    try {
      await approvalApi.approveApproval(selectedApproval.id, { comment });
      setVisible(false);
      fetchApprovals();
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval) return;
    setActionLoading(true);
    try {
      await approvalApi.rejectApproval(selectedApproval.id, { comment });
      setVisible(false);
      fetchApprovals();
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#d97706';
      case 'approved':
        return '#16a34a';
      case 'rejected':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '待审批';
      case 'approved':
        return '已通过';
      case 'rejected':
        return '已拒绝';
      default:
        return status;
    }
  };

  const renderItem = ({ item }: { item: Approval }) => (
    <TouchableOpacity onPress={() => showDetail(item)}>
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.typeContainer}>
              <FileText size={16} color="#2563eb" />
              <Text style={styles.typeText}>{item.type || '审批申请'}</Text>
            </View>
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
            >
              <Text style={{ color: getStatusColor(item.status), fontSize: 11, fontWeight: '600' }}>
                {getStatusLabel(item.status)}
              </Text>
            </Chip>
          </View>

          <Title style={styles.title}>{item.title}</Title>
          <Paragraph style={styles.description} numberOfLines={2}>
            {item.description || '暂无描述'}
          </Paragraph>

          <View style={styles.cardFooter}>
            <View style={styles.userInfo}>
              <Avatar.Icon
                size={28}
                icon={() => <User size={14} color="#fff" />}
                style={{ backgroundColor: '#2563eb' }}
              />
              <Text style={styles.userName}>{item.applicantName || '申请人'}</Text>
            </View>
            <View style={styles.timeInfo}>
              <Clock size={12} color="#9ca3af" />
              <Text style={styles.timeText}>
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
              </Text>
            </View>
          </View>

          {item.status === 'pending' && (
            <View style={styles.actionRow}>
              <Button
                mode="outlined"
                onPress={(e) => {
                  e.stopPropagation();
                  showDetail(item);
                }}
                style={styles.actionButton}
                textColor="#dc2626"
                icon={() => <XCircle size={16} color="#dc2626" />}
              >
                拒绝
              </Button>
              <Button
                mode="contained"
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedApproval(item);
                  setComment('');
                  setVisible(true);
                }}
                style={[styles.actionButton, { backgroundColor: '#16a34a' }]}
                icon={() => <CheckCircle size={16} color="#fff" />}
              >
                通过
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
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
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { key: 'pending', label: '待审批' },
            { key: 'approved', label: '已通过' },
            { key: 'rejected', label: '已拒绝' },
            { key: 'all', label: '全部' },
          ]}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterButton, statusFilter === item.key && styles.filterButtonActive]}
              onPress={() => setStatusFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === item.key && styles.filterButtonTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={approvals}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ClipboardCheck size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>暂无审批</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)}>
          <Dialog.Title>{selectedApproval?.title || '审批详情'}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogLabel}>审批类型</Text>
            <Text style={styles.dialogValue}>{selectedApproval?.type || '审批申请'}</Text>
            <Text style={styles.dialogLabel}>申请人</Text>
            <Text style={styles.dialogValue}>{selectedApproval?.applicantName || '-'}</Text>
            <Text style={styles.dialogLabel}>审批说明</Text>
            <Text style={styles.dialogValue}>{selectedApproval?.description || '暂无描述'}</Text>
            <Text style={styles.dialogLabel}>审批意见（可选）</Text>
            <TextInput
              mode="outlined"
              value={comment}
              onChangeText={setComment}
              placeholder="请输入审批意见..."
              multiline
              numberOfLines={3}
              style={styles.commentInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)} disabled={actionLoading}>
              取消
            </Button>
            <Button
              onPress={handleReject}
              textColor="#dc2626"
              disabled={actionLoading}
              icon={() => <XCircle size={16} color="#dc2626" />}
            >
              拒绝
            </Button>
            <Button
              onPress={handleApprove}
              textColor="#16a34a"
              disabled={actionLoading}
              icon={() => <CheckCircle size={16} color="#16a34a" />}
            >
              通过
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
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
  filterContainer: {
    padding: 12,
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
  typeText: {
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
    marginBottom: 4,
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 8,
    fontWeight: '500',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    marginLeft: 8,
    borderRadius: 8,
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
  dialogLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 12,
  },
  dialogValue: {
    fontSize: 14,
    color: '#111827',
    marginTop: 4,
  },
  commentInput: {
    marginTop: 8,
    fontSize: 14,
  },
});

export default ApprovalPage;
