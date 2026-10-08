import { designTokens } from '@topems/tokens';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  Chip,
  Text,
  Button,
  Divider,
  IconButton,
  TextInput,
} from 'react-native-paper';
import { approvalApi } from '@/api/approval';
import type { Approval } from '@/types';
import {
  ClipboardCheck,
  User,
  Clock,
  FileText,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
} from 'lucide-react-native';
import { zh } from '../i18n/zh';

type ApprovalDetailPageProps = {
  route: {
    params: {
      id: string;
    };
  };
  navigation: {
    goBack: () => void;
  };
};

const ApprovalDetailPage: React.FC<ApprovalDetailPageProps> = ({ route, navigation }) => {
  const { id } = route.params;
  const [approval, setApproval] = useState<Approval | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchApproval();
  }, [id]);

  const fetchApproval = async () => {
    setLoading(true);
    try {
      const response = await approvalApi.getTaskById(id);
      if (response.success && response.data) {
        setApproval(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch approval:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchApproval();
  };

  const handleApprove = async () => {
    if (!approval) return;
    setActionLoading(true);
    try {
      await approvalApi.approveApproval(id, { comment });
      Alert.alert(zh['common.success'], zh['approval.approvedMsg']);
      fetchApproval();
      setComment('');
    } catch (error) {
      console.error('Failed to approve:', error);
      Alert.alert(zh['common.error'], zh['approval.operateFailed']);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!approval) return;
    setActionLoading(true);
    try {
      await approvalApi.rejectApproval(id, { comment });
      Alert.alert(zh['common.success'], zh['approval.rejectedMsg']);
      fetchApproval();
      setComment('');
    } catch (error) {
      console.error('Failed to reject:', error);
      Alert.alert(zh['common.error'], zh['approval.operateFailed']);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return designTokens.colors.warning[600];
      case 'approved':
        return designTokens.colors.success[600];
      case 'rejected':
        return designTokens.colors.error[600];
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return zh['approval.statusPending'];
      case 'approved':
        return zh['approval.statusApproved'];
      case 'rejected':
        return zh['approval.statusRejected'];
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return designTokens.colors.error[600];
      case 'medium':
        return designTokens.colors.warning[600];
      case 'low':
        return designTokens.colors.success[600];
      default:
        return '#6b7280';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical':
        return zh['common.priorityUrgent'];
      case 'high':
        return zh['common.priorityHigh'];
      case 'medium':
        return zh['common.priorityMedium'];
      case 'low':
        return zh['common.priorityLow'];
      default:
        return priority;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating size="large" color={designTokens.colors.blue[600]} />
      </View>
    );
  }

  if (!approval) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon={() => <ArrowLeft size={24} color={designTokens.colors.common.white} />}
            onPress={() => navigation.goBack()}
          />
          <Title style={styles.headerTitle}>{zh['approval.detailTitle']}</Title>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.emptyContainer}>
          <ClipboardCheck size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>{zh['approval.notFound']}</Text>
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
        <Title style={styles.headerTitle}>{zh['approval.detailTitle']}</Title>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        <Card style={styles.mainCard} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.typeContainer}>
                <FileText size={20} color={designTokens.colors.blue[600]} />
                <Text style={styles.typeText}>
                  {approval.type || zh['common.approvalApplication']}
                </Text>
              </View>
              <Chip
                textStyle={{ fontSize: 11, fontWeight: '600' }}
                style={[
                  styles.statusChip,
                  { backgroundColor: getStatusColor(approval.status) + '20' },
                ]}
              >
                <Text
                  style={{
                    color: getStatusColor(approval.status),
                    fontSize: 11,
                    fontWeight: '600',
                  }}
                >
                  {getStatusLabel(approval.status)}
                </Text>
              </Chip>
            </View>

            <Title style={styles.title}>{approval.title}</Title>

            {approval.description && (
              <Paragraph style={styles.description}>{approval.description}</Paragraph>
            )}

            <View style={styles.priorityRow}>
              <AlertCircle size={16} color={getPriorityColor(approval.priority)} />
              <Text style={[styles.priorityText, { color: getPriorityColor(approval.priority) }]}>
                {getPriorityLabel(approval.priority)}
                {zh['common.prioritySuffix']}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.infoCard} mode="elevated">
          <Card.Content>
            <Title style={styles.sectionTitle}>{zh['approval.basicInfo']}</Title>
            <View style={styles.infoGrid}>
              <View style={styles.infoRow}>
                <User size={16} color={designTokens.colors.blue[600]} />
                <Text style={styles.infoLabel}>{zh['common.applicant']}</Text>
                <Text style={styles.infoValue}>{approval.applicantName || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <User size={16} color={designTokens.colors.blue[600]} />
                <Text style={styles.infoLabel}>{zh['approval.approver']}</Text>
                <Text style={styles.infoValue}>{approval.assigneeName || '-'}</Text>
              </View>
              <Divider style={styles.divider} />
              <View style={styles.infoRow}>
                <Clock size={16} color="#9ca3af" />
                <Text style={styles.infoLabel}>{zh['common.createdAt']}</Text>
                <Text style={styles.infoValue}>{formatDate(approval.createdAt)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Clock size={16} color="#9ca3af" />
                <Text style={styles.infoLabel}>{zh['common.updatedAt']}</Text>
                <Text style={styles.infoValue}>{formatDate(approval.updatedAt)}</Text>
              </View>
              {approval.dueDate && (
                <View style={styles.infoRow}>
                  <Clock size={16} color={designTokens.colors.warning[600]} />
                  <Text style={styles.infoLabel}>{zh['approval.dueDate']}</Text>
                  <Text style={[styles.infoValue, { color: designTokens.colors.warning[600] }]}>
                    {formatDate(approval.dueDate)}
                  </Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        {approval.status === 'pending' && (
          <Card style={styles.actionCard} mode="elevated">
            <Card.Content>
              <Title style={styles.sectionTitle}>{zh['approval.actions']}</Title>
              <View style={styles.commentSection}>
                <MessageSquare size={16} color="#6b7280" />
                <Text style={styles.commentLabel}>{zh['common.approvalCommentOptional']}</Text>
              </View>
              <TextInput
                mode="outlined"
                value={comment}
                onChangeText={setComment}
                placeholder={zh['common.approvalCommentPlaceholder']}
                multiline
                numberOfLines={4}
                style={styles.commentInput}
              />
              <View style={styles.actionButtons}>
                <Button
                  mode="outlined"
                  style={[styles.actionButton, styles.rejectButton]}
                  icon={() => <XCircle size={16} color={designTokens.colors.error[600]} />}
                  onPress={handleReject}
                  disabled={actionLoading}
                  textColor={designTokens.colors.error[600]}
                >
                  {zh['common.reject']}
                </Button>
                <Button
                  mode="contained"
                  style={[styles.actionButton, styles.approveButton]}
                  icon={() => <CheckCircle size={16} color={designTokens.colors.common.white} />}
                  onPress={handleApprove}
                  disabled={actionLoading}
                >
                  {zh['common.approve']}
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {approval.status !== 'pending' && (
          <Card style={styles.statusCard} mode="elevated">
            <Card.Content>
              <View style={styles.statusInfo}>
                {approval.status === 'approved' ? (
                  <CheckCircle size={40} color={designTokens.colors.success[600]} />
                ) : (
                  <XCircle size={40} color={designTokens.colors.error[600]} />
                )}
                <View style={styles.statusTextSection}>
                  <Text style={[styles.statusResult, { color: getStatusColor(approval.status) }]}>
                    {getStatusLabel(approval.status)}
                  </Text>
                  <Text style={styles.statusSubtext}>{zh['approval.flowEnded']}</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
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
    backgroundColor: designTokens.colors.blue[600],
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeText: {
    fontSize: 12,
    color: designTokens.colors.blue[600],
    fontWeight: '600',
  },
  statusChip: {
    height: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityText: {
    fontSize: 13,
    fontWeight: '600',
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
    width: 60,
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
  actionCard: {
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: designTokens.colors.warning[50],
  },
  commentSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  commentLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  commentInput: {
    fontSize: 14,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    height: 48,
  },
  approveButton: {
    backgroundColor: designTokens.colors.success[600],
  },
  rejectButton: {
    borderColor: designTokens.colors.error[600],
  },
  statusCard: {
    borderRadius: 16,
    marginBottom: 12,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  statusTextSection: {
    gap: 4,
  },
  statusResult: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusSubtext: {
    fontSize: 13,
    color: '#6b7280',
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

export default ApprovalDetailPage;
