import { designTokens } from '@topems/tokens';
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
import { zh, syncSuccessMessage } from '../i18n/zh';

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
      Alert.alert(zh['common.alertHint'], zh['settings.offlineCannotSync']);
      return;
    }

    setIsSyncing(true);
    try {
      const result = await offlineApi.syncAll();
      if (result.success) {
        Alert.alert(zh['settings.syncSuccess'], syncSuccessMessage(result.data?.success));
        await loadOfflineStats();
      } else {
        Alert.alert(zh['settings.syncResult'], result.message || zh['settings.syncComplete']);
      }
    } catch {
      Alert.alert(zh['settings.syncFailed'], zh['settings.syncError']);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearOfflineData = async () => {
    Alert.alert(zh['settings.confirmClearOffline'], zh['settings.clearOfflineConfirmMsg'], [
      { text: zh['common.cancel'], style: 'cancel' },
      {
        text: zh['common.confirm'],
        onPress: async () => {
          await offlineApi.clearAll();
          await loadOfflineStats();
          Alert.alert(zh['common.success'], zh['settings.offlineDataCleared']);
        },
      },
    ]);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await userApi.updateProfile({ name: editName, phone: editPhone });
      Alert.alert(zh['common.success'], zh['settings.profileUpdated']);
      setIsEditing(false);
    } catch {
      Alert.alert(zh['common.error'], zh['settings.updateFailedRetry']);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    Alert.prompt(
      zh['settings.changePassword'],
      zh['settings.enterOldPassword'],
      async (oldPassword) => {
        if (!oldPassword) return;
        Alert.prompt(
          zh['settings.changePassword'],
          zh['settings.enterNewPassword'],
          async (newPassword) => {
            if (!newPassword) return;
            try {
              await userApi.changePassword({ oldPassword, newPassword });
              Alert.alert(zh['common.success'], zh['settings.passwordChanged']);
              logout();
            } catch {
              Alert.alert(zh['common.error'], zh['settings.passwordChangeFailed']);
            }
          },
        );
      },
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Settings size={24} color={designTokens.colors.blue[500]} />
        <Text style={styles.headerTitle}>{zh['common.settings']}</Text>
      </View>
      <Divider />

      <Card style={styles.sectionCard} mode="elevated">
        <Card.Content>
          <Text style={styles.sectionTitle}>{zh['settings.personalInfo']}</Text>
          <Divider style={styles.sectionDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{zh['settings.name']}</Text>
            <View style={styles.infoValueContainer}>
              {isEditing ? (
                <TextInput style={styles.infoValue} onChangeText={setEditName} value={editName} />
              ) : (
                <Text style={styles.infoValue}>{user?.name || '-'}</Text>
              )}
              {!isEditing && (
                <Button
                  mode="text"
                  onPress={() => setIsEditing(true)}
                  textColor={designTokens.colors.blue[500]}
                >
                  {zh['common.edit']}
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
                    {zh['common.cancel']}
                  </Button>
                </View>
              )}
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{zh['settings.phone']}</Text>
            <Text style={styles.infoValue}>
              {isEditing ? (
                <TextInput style={styles.infoValue} onChangeText={setEditPhone} value={editPhone} />
              ) : (
                user?.phone || '-'
              )}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{zh['common.email']}</Text>
            <Text style={styles.infoValue}>{user?.email || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{zh['settings.role']}</Text>
            <Text style={styles.infoValue}>{user?.roles?.[0] || '-'}</Text>
          </View>
          <Divider style={styles.sectionDivider} />
          <List.Item
            title={zh['settings.changePassword']}
            left={() => <Shield size={20} color="#6b7280" />}
            right={() => <ChevronRight size={20} color="#9ca3af" />}
            onPress={handleChangePassword}
          />
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard} mode="elevated">
        <Card.Content>
          <Text style={styles.sectionTitle}>{zh['settings.notificationSettings']}</Text>
          <Divider style={styles.sectionDivider} />
          <List.Item
            title={zh['settings.pushNotification']}
            left={() => <Bell size={20} color="#6b7280" />}
            right={() => (
              <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
            )}
          />
          <List.Item
            title={zh['settings.notificationSound']}
            left={() => <Bell size={20} color="#6b7280" />}
            right={() => <Switch value={soundEnabled} onValueChange={setSoundEnabled} />}
          />
          <List.Item
            title={zh['settings.vibrationFeedback']}
            left={() => <RefreshCw size={20} color="#6b7280" />}
            right={() => <Switch value={vibrationEnabled} onValueChange={setVibrationEnabled} />}
          />
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard} mode="elevated">
        <Card.Content>
          <Text style={styles.sectionTitle}>{zh['settings.appSettings']}</Text>
          <Divider style={styles.sectionDivider} />
          <List.Item
            title={zh['settings.language']}
            left={() => <Globe size={20} color="#6b7280" />}
            right={() => (
              <View style={styles.rightTextContainer}>
                <Text style={styles.rightText}>{zh['settings.languageChinese']}</Text>
                <ChevronRight size={20} color="#9ca3af" />
              </View>
            )}
          />
          <List.Item
            title={zh['settings.theme']}
            left={() => <Palette size={20} color="#6b7280" />}
            right={() => (
              <View style={styles.rightTextContainer}>
                <Text style={styles.rightText}>{zh['settings.themeLight']}</Text>
                <ChevronRight size={20} color="#9ca3af" />
              </View>
            )}
          />
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard} mode="elevated">
        <Card.Content>
          <Text style={styles.sectionTitle}>{zh['settings.offlineDataManagement']}</Text>
          <Divider style={styles.sectionDivider} />
          <View style={styles.offlineStatusRow}>
            <View style={styles.offlineIconContainer}>
              {isOffline ? (
                <CloudOff size={24} color={designTokens.colors.error[600]} />
              ) : (
                <Upload size={24} color={designTokens.colors.success[600]} />
              )}
            </View>
            <View style={styles.offlineStatusContent}>
              <Text style={styles.offlineStatusText}>
                {isOffline ? zh['settings.offlineMode'] : zh['settings.onlineMode']}
              </Text>
              <Text style={styles.offlineStatusHint}>
                {isOffline ? zh['settings.offlineHint'] : zh['settings.onlineHint']}
              </Text>
            </View>
          </View>
          <Divider style={styles.sectionDivider} />
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Database size={16} color="#6b7280" />
              <Text style={styles.statLabel}>{zh['settings.pendingSync']}</Text>
              <Text style={[styles.statValue, pendingCount > 0 ? styles.statValueWarning : {}]}>
                {pendingCount}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Database size={16} color="#6b7280" />
              <Text style={styles.statLabel}>{zh['settings.cachedData']}</Text>
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
            {isSyncing
              ? zh['settings.syncing']
              : pendingCount === 0
                ? zh['settings.noPendingData']
                : zh['common.syncNow']}
          </Button>
          <Button
            mode="text"
            onPress={handleClearOfflineData}
            textColor="#9ca3af"
            style={styles.clearButton}
          >
            {zh['settings.clearOfflineData']}
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard} mode="elevated">
        <Card.Content>
          <List.Item
            title={zh['common.helpCenter']}
            left={() => <HelpCircle size={20} color="#6b7280" />}
            right={() => <ChevronRight size={20} color="#9ca3af" />}
          />
          <Divider />
          <List.Item
            title={zh['common.aboutUs']}
            left={() => <Info size={20} color="#6b7280" />}
            right={() => <ChevronRight size={20} color="#9ca3af" />}
          />
        </Card.Content>
      </Card>

      <Button
        mode="outlined"
        onPress={logout}
        style={styles.logoutButton}
        textColor={designTokens.colors.error[600]}
        icon={() => <RefreshCw size={18} color={designTokens.colors.error[600]} />}
      >
        {zh['common.logout']}
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
    backgroundColor: designTokens.colors.common.white,
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
    borderColor: designTokens.colors.error[600],
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
    color: designTokens.colors.warning[500],
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
