import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { Text, Card, IconButton, Divider, Badge } from 'react-native-paper';
import { documentApi } from '@/api/document';
import type { Document } from '@/types';
import { FileText, Search, Download, FolderOpen, ChevronRight } from 'lucide-react-native';

const DocumentPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await documentApi.getDocuments({
        page: 1,
        pageSize: 20,
        search: searchQuery,
      });
      if (response.success && response.data) {
        setDocuments(response.data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [searchQuery]);

  const handleSearch = () => {
    fetchDocuments();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'published':
        return <Badge style={[styles.statusBadge, styles.publishedBadge]}>已发布</Badge>;
      case 'draft':
        return <Badge style={[styles.statusBadge, styles.draftBadge]}>草稿</Badge>;
      case 'archived':
        return <Badge style={[styles.statusBadge, styles.archivedBadge]}>已归档</Badge>;
      default:
        return null;
    }
  };

  const renderItem = ({ item }: { item: Document }) => (
    <Card style={styles.documentCard} mode="elevated">
      <Card.Content style={styles.documentContent}>
        <View style={styles.documentIcon}>
          <FileText size={32} color="#3b82f6" />
        </View>
        <View style={styles.documentBody}>
          <View style={styles.documentHeader}>
            <Text style={styles.documentTitle}>{item.title}</Text>
            {getStatusBadge(item.status)}
          </View>
          {item.description && (
            <Text style={styles.documentDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}
          <View style={styles.documentMeta}>
            <Text style={styles.documentMetaText}>{item.fileName}</Text>
            <Text style={styles.documentMetaText}>{formatFileSize(item.fileSize)}</Text>
            <Text style={styles.documentMetaText}>{formatDate(item.updatedAt)}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.actionButton}>
          <IconButton icon="chevron-right" size={24} color="#9ca3af" />
        </TouchableOpacity>
      </Card.Content>
      <Card.Actions style={styles.documentActions}>
        <TouchableOpacity style={styles.actionItem}>
          <Download size={18} color="#3b82f6" />
          <Text style={styles.actionText}>下载</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem}>
          <FolderOpen size={18} color="#3b82f6" />
          <Text style={styles.actionText}>预览</Text>
        </TouchableOpacity>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <FileText size={24} color="#3b82f6" />
          <Text style={styles.headerTitle}>文档中心</Text>
        </View>
      </View>
      <Divider />
      <View style={styles.searchContainer}>
        <Search size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="搜索文档"
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
          data={documents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchDocuments} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FileText size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>暂无文档</Text>
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
  },
  documentCard: {
    borderRadius: 12,
  },
  documentContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  documentIcon: {
    marginTop: 4,
  },
  documentBody: {
    flex: 1,
    gap: 4,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  documentDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  documentMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  documentMetaText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  publishedBadge: {
    backgroundColor: '#d1fae5',
    color: '#059669',
  },
  draftBadge: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
  },
  archivedBadge: {
    backgroundColor: '#e5e7eb',
    color: '#6b7280',
  },
  actionButton: {
    padding: 4,
  },
  documentActions: {
    justifyContent: 'flex-start',
    paddingLeft: 16,
    gap: 24,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    color: '#3b82f6',
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

export default DocumentPage;
