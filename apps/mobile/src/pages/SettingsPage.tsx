import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { Text, Card, List, Switch, Divider, Button } from 'react-native-paper';
import { useAuthStore } from '@/store/authStore';
import { userApi } from '@/api/user';
import { offlineApi } from '@/api/offline';
import { NetworkService } from '@/services/networkService';
import {
  Settings,
  Bell,
  Shield,
  Globe,
  Palette,
  HelpCircle,
  Info,
  ChevronRight,
  Save,
  RefreshCw,
  CloudOff,
  Upload,
  Database,
} from 'lucide-react-native';

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState<{ pendingRecords: number; cachedEntries: number }>({
    pendingRecords: 0,
    cachedEntries: 0,
  });

  useEffect(() => {
    const unsubscribe = NetworkService.addListener((state) => {
      setIsOffline(state.status === 'offline');
    });

    loadOfflineStats();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(loadOfflineStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadOfflineStats = async () => {
    const result = await offlineApi.getOfflineStats();
    if (result.success && result.data) {
      setPendingCount(result.data.pendingRecords);
      setSyncStats(result.data);
    }
  };

  const handleSyncNow = async () => {
    if (isOffline) {
      Alert.alert('提示', '当前处于离线状态，请连接网络后再尝试同步');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await offlineApi.syncAll();
      if (result.success) {
        Alert.alert('同步成功', `成功同步 ${result.data?.success} 条记录`);
        await loadOfflineStats();
      } else {
        Alert.alert('同步结果', result.message || '同步完成');
      }
    } catch (error) {
      Alert.alert('同步失败', '同步过程中出现错误');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearOfflineData = async () => {
    Alert.alert('确认清除', '确定要清除所有离线数据吗？未同步的数据将丢失。', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: async () => {
          await offlineApi.clearAll();
          await loadOfflineStats();
          Alert.alert('成功', '离线数据已清除');
        },
      },
    ]);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await userApi.updateProfile({ name: editName, phone: editPhone });
      Alert.alert('成功', '个人信息已更新');
      setIsEditing(false);
    } catch (error) {
      Alert.alert('错误', '更新失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    Alert.prompt('修改密码', '请输入旧密码', async (oldPassword) => {
      if (!oldPassword) return;
      Alert.prompt('修改密码', '请输入新密码', async (newPassword) => {
        if (!newPassword) return;
        try {
          await userApi.changePassword({ oldPassword, newPassword });
          Alert.alert('成功', '密码修改成功，请重新登录');
          logout();
        } catch (error) {
          Alert.alert('错误', '密码修改失败');
        }
      });
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Settings size={24} color="#3b82f6" />
        <Text style={styles.headerTitle}>设置</Text>
      </View>
      <Divider />

      <Card style={styles.sectionCard} mode="elevated">
        <Card.Content>
          <Text style={styles.sectionTitle}>个人信息</Text>
          <Divider style={styles.sectionDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>姓名</Text>
            <View style={styles.infoValueContainer}>
              {isEditing ? (
                <TextInput
                  style={styles.infoValue}
                  onChangeText={setEditName}
                  value={editName}
                />
              ) : (
                <Text style={styles.infoValue}>{user?.name || '-'}</Text>
              )}
              {!isEditing && (
                <Button mode="text" onPress={() => setIsEditing(true)} textColor="#3b82f6">
                  编辑
                </Button>
              )}
              {isEditing && (
                <View style={styles.editActions}>
                  <Button
                    mode="text"
                    onPress={handleSaveProfile}
                    textColor="#10b981"
                    loading={isSaving}
                  >
                    <Save size={16} />
                  </Button>
                  <Button mode="text" onPress={() => setIsEditing(false)} textColor="#6b7280">
                    取消
                  </Button>
                </View>
              )}
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>手机号</Text>
            <Text style={styles.infoValue}>
              {isEditing ? (
                <TextInput style={styles.infoValue} onChangeText={setEditPhone} value={editPhone} />
              ) : (
                user?.phone || '-'
              )}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>邮箱</Text>
            <Text style={styles.infoValue}>{user?.email || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>角色</Text>
            <Text style={styles.infoValue}>{user?.roles?.[0] || '-'}</Text>
          </View>
          <Divider style={styles.sectionDivider} />
          <List.Item
            title="修改密码"
            left={() => <Shield size={20} color="#6b7280" />}
            right={() => <ChevronRight size={20} color="#9ca3af" />}
            onPress={handleChangePassword}
          />
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard} mode="elevated">
        <Card.Content>
          <Text style={styles.sectionTitle}>通知设置</Text>
          <Divider style={styles.sectionDivider} />
          <List.Item
            title="推送通知"
            left={() => <Bell size={20} color="#6b7280" />}
            right={() => (
              <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
            )}
          />
          <List.Item
            title="通知声音"
            left={() => <Bell size={20} color="#6b7280" />}
            right={() => <Switch value={soundEnabled} onValueChange={setSoundEnabled} />}
          />
          <List.Item
            title="震动反馈"
            left={() => <RefreshCw size={20} color="#6b7280" />}
            right={() => <Switch value={vibrationEnabled} onValueChange={setVibrationEnabled} />}
          />
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard} mode="elevated">
        <Card.Content>
          <Text style={styles.sectionTitle}>应用设置</Text>
          <Divider style={styles.sectionDivider} />
          <List.Item
            title="语言"
            left={() => <Globe size={20} color="#6b7280" />}
            right={() => (
              <View style={styles.rightTextContainer}>
                <Text style={styles.rightText}>中文</Text>
                <ChevronRight size={20} color="#9ca3af" />
              </View>
            )}
          />
          <List.Item
            title="主题"
            left={() => <Palette size={20} color="#6b7280" />}
            right={() => (
              <View style={styles.rightTextContainer}>
                <Text style={styles.rightText}>浅色</Text>
                <ChevronRight size={20} color="#9ca3af" />
              </View>
            )}
          />
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard} mode="elevated">
        <Card.Content>
          <Text style={styles.sectionTitle}>离线数据管理</Text>
          <Divider style={styles.sectionDivider} />
          <View style={styles.offlineStatusRow}>
            <View style={styles.offlineIconContainer}>
              {isOffline ? (
                <CloudOff size={24} color="#dc2626" />
              ) : (
                <Upload size={24} color="#16a34a" />
              )}
            </View>
            <View style={styles.offlineStatusContent}>
              <Text style={styles.offlineStatusText}>
                {isOffline ? '当前处于离线模式' : '当前处于在线模式'}
              </Text>
              <Text style={styles.offlineStatusHint}>
                {isOffline ? '操作将保存到本地，网络恢复后自动同步' : '数据实时同步到云端'}
              </Text>
            </View>
          </View>
          <Divider style={styles.sectionDivider} />
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Database size={16} color="#6b7280" />
              <Text style={styles.statLabel}>待同步</Text>
              <Text style={[styles.statValue, pendingCount > 0 ? styles.statValueWarning : {}]}>
                {pendingCount}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Database size={16} color="#6b7280" />
              <Text style={styles.statLabel}>缓存数据</Text>
              <Text style={styles.statValue}>{syncStats.cachedEntries}</Text>
            </View>
          </View>
          <Divider style={styles.sectionDivider} />
          <Button
            mode="contained"
            onPress={handleSyncNow}
            disabled={isOffline || pendingCount === 0}
            loading={isSyncing}
            style={styles.syncButton}
            icon={() => <Upload size={18} />}
          >
            {isSyncing ? '同步中...' : pendingCount === 0 ? '暂无待同步数据' : '立即同步'}
          </Button>
          <Button
            mode="text"
            onPress={handleClearOfflineData}
            textColor="#9ca3af"
            style={styles.clearButton}
          >
            清除离线数据
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard} mode="elevated">
        <Card.Content>
          <List.Item
            title="帮助中心"
            left={() => <HelpCircle size={20} color="#6b7280" />}
            right={() => <ChevronRight size={20} color="#9ca3af" />}
          />
          <Divider />
          <List.Item
            title="关于我们"
            left={() => <Info size={20} color="#6b7280" />}
            right={() => <ChevronRight size={20} color="#9ca3af" />}
          />
        </Card.Content>
      </Card>

      <Button
        mode="outlined"
        onPress={logout}
        style={styles.logoutButton}
        textColor="#dc2626"
        icon={() => <RefreshCw size={18} color="#dc2626" />}
      >
        退出登录
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  sectionDivider: {
    marginVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  rightTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rightText: {
    fontSize: 14,
    color: '#6b7280',
  },
  logoutButton: {
    margin: 16,
    borderRadius: 12,
    borderColor: '#dc2626',
  },
  offlineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  offlineIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineStatusContent: {
    flex: 1,
  },
  offlineStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  offlineStatusHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  statValueWarning: {
    color: '#f59e0b',
  },
  syncButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  clearButton: {
    marginTop: 8,
  },
});

export default SettingsPage;
