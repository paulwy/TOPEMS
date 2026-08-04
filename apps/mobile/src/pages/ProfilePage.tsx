import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, List, Avatar, Text, Button, Divider } from 'react-native-paper';
import { useAuthStore } from '@/store/authStore';
import { User, Bell, Settings, HelpCircle, Info, LogOut } from 'lucide-react-native';

interface ProfilePageProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

const ProfilePage: React.FC<ProfilePageProps> = ({ navigation }) => {
  const { user, logout } = useAuthStore();

  return (
    <ScrollView style={styles.profileContainer}>
      <Card style={styles.profileCard} mode="elevated">
        <Card.Content style={styles.profileHeader}>
          <Avatar.Icon
            size={64}
            icon={() => <User size={32} color="#fff" />}
            style={{ backgroundColor: '#2563eb' }}
          />
          <View style={styles.profileInfo}>
            <Title style={styles.profileName}>{user?.name || user?.full_name || '用户'}</Title>
            <Text style={styles.profileRole}>{user?.roles?.[0] || '员工'}</Text>
            {user?.email && <Text style={styles.profileEmail}>{user.email}</Text>}
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.menuCard} mode="elevated">
        <Card.Content>
          <List.Item
            title="消息通知"
            left={() => <Bell size={20} color="#6b7280" />}
            right={() => <List.Icon icon="chevron-right" color="#9ca3af" />}
            onPress={() => navigation.navigate('Notification')}
          />
          <Divider />
          <List.Item
            title="设置"
            left={() => <Settings size={20} color="#6b7280" />}
            right={() => <List.Icon icon="chevron-right" color="#9ca3af" />}
            onPress={() => navigation.navigate('Settings')}
          />
          <Divider />
          <List.Item
            title="帮助中心"
            left={() => <HelpCircle size={20} color="#6b7280" />}
            right={() => <List.Icon icon="chevron-right" color="#9ca3af" />}
          />
          <Divider />
          <List.Item
            title="关于我们"
            left={() => <Info size={20} color="#6b7280" />}
            right={() => <List.Icon icon="chevron-right" color="#9ca3af" />}
          />
        </Card.Content>
      </Card>

      <Card style={styles.statsCard} mode="elevated">
        <Card.Content>
          <Text style={styles.statsTitle}>快捷统计</Text>
          <Divider style={styles.sectionDivider} />
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>待审批</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>进行中任务</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>未读消息</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Button
        mode="outlined"
        onPress={logout}
        style={styles.logoutButton}
        textColor="#dc2626"
        icon={() => <LogOut size={18} color="#dc2626" />}
      >
        退出登录
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  profileContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  profileCard: {
    margin: 16,
    borderRadius: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  profileInfo: {
    marginLeft: 16,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
  },
  profileRole: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  menuCard: {
    marginHorizontal: 16,
    borderRadius: 16,
  },
  statsCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  sectionDivider: {
    marginVertical: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  logoutButton: {
    margin: 16,
    borderRadius: 12,
    borderColor: '#dc2626',
  },
});

export default ProfilePage;
