import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  ActivityIndicator,
  Text,
  Button,
  Chip,
  Divider,
  List,
} from 'react-native-paper';
import { attendanceApi } from '@/api/attendance';
import { scanApi } from '@/api/scan';
import ScanModal from '@/components/ScanModal';
import { ScanService } from '@/services/scanService';
import type { AttendanceRecord, AttendanceStats } from '@/types';
import {
  MapPin,
  Clock,
  AlertTriangle,
  LogIn,
  LogOut,
  Calendar,
  TrendingUp,
  QrCode,
} from 'lucide-react-native';

const AttendancePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);
  const [location] = useState<{ lat: number; lng: number } | null>(null);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, recordsRes, todayRes] = await Promise.all([
        attendanceApi.getAttendanceStats(),
        attendanceApi.getAttendanceRecords({ pageSize: 7 }),
        attendanceApi.getTodayRecord(),
      ]);

      if (statsRes.success) setStats(statsRes.data as AttendanceStats);
      if (recordsRes.success) setRecords(recordsRes.data.items);
      if (todayRes.success) setTodayRecord(todayRes.data);
    } catch (error) {
      console.error('Failed to fetch attendance data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      const response = await attendanceApi.checkIn({
        latitude: location?.lat || 0,
        longitude: location?.lng || 0,
      });
      if (response.success) {
        setTodayRecord(response.data);
        fetchData();
      }
    } catch (error) {
      console.error('Check-in failed:', error);
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckOutLoading(true);
    try {
      const response = await attendanceApi.checkOut({
        latitude: location?.lat || 0,
        longitude: location?.lng || 0,
      });
      if (response.success) {
        setTodayRecord(response.data);
        fetchData();
      }
    } catch (error) {
      console.error('Check-out failed:', error);
    } finally {
      setCheckOutLoading(false);
    }
  };

  const handleScanPress = () => {
    setScanModalVisible(true);
  };

  const handleScanSuccess = async (type: string, data: string) => {
    setScanModalVisible(false);
    setScanLoading(true);

    try {
      const isQR = ScanService.isQRCode(type);
      const scanType = isQR ? 'qr' : 'barcode';
      const scanData = isQR ? data : data;

      const response = isQR
        ? await scanApi.scanQrcode({
            qr_data: scanData,
            location_lat: location?.lat,
            location_lng: location?.lng,
          })
        : await scanApi.scanBarcode({
            barcode: scanData,
            scan_type: scanType,
            location_lat: location?.lat,
            location_lng: location?.lng,
          });

      if (response.success) {
        if (!todayRecord?.checkInTime) {
          await handleCheckIn();
          Alert.alert('扫码签到成功', `识别内容: ${data}`);
        } else if (!todayRecord?.checkOutTime) {
          await handleCheckOut();
          Alert.alert('扫码签退成功', `识别内容: ${data}`);
        } else {
          Alert.alert('扫码成功', `识别内容: ${data}\n今日考勤已完成`);
        }
      } else {
        Alert.alert('扫码失败', response.message || '扫码服务异常');
      }
    } catch (error) {
      console.error('Scan failed:', error);
      Alert.alert('扫码失败', '无法连接到服务器');
    } finally {
      setScanLoading(false);
    }
  };

  const handleScanClose = () => {
    setScanModalVisible(false);
  };

  const getToday = () => {
    const now = new Date();
    return now.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return '#16a34a';
      case 'late':
        return '#d97706';
      case 'early_leave':
        return '#ea580c';
      case 'absent':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'normal':
        return '正常';
      case 'late':
        return '迟到';
      case 'early_leave':
        return '早退';
      case 'absent':
        return '缺勤';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.dateText}>{getToday()}</Text>
        <Text style={styles.greetingText}>今日考勤</Text>
      </View>

      <Card style={styles.checkInCard} mode="elevated">
        <Card.Content>
          <View style={styles.locationRow}>
            <MapPin size={14} color="#2563eb" />
            <Text style={styles.locationText}>当前位置：已定位</Text>
          </View>

          <View style={styles.timeDisplay}>
            <Clock size={48} color="#2563eb" />
            <Text style={styles.currentTime}>
              {new Date().toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          <View style={styles.checkButtonRow}>
            <View style={styles.checkButtonContainer}>
              <Button
                mode="contained"
                onPress={handleCheckIn}
                loading={checkInLoading}
                disabled={checkInLoading || !!todayRecord?.checkInTime}
                style={[styles.checkButton, styles.checkInButton]}
                contentStyle={styles.checkButtonContent}
                icon={() => <LogIn size={18} color="#fff" />}
              >
                {todayRecord?.checkInTime
                  ? `签到 ${new Date(todayRecord.checkInTime).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : '上班签到'}
              </Button>
              <Text style={styles.checkButtonLabel}>上班打卡</Text>
            </View>

            <View style={styles.checkButtonContainer}>
              <Button
                mode="contained"
                onPress={handleCheckOut}
                loading={checkOutLoading}
                disabled={checkOutLoading || !todayRecord?.checkInTime}
                style={[
                  styles.checkButton,
                  styles.checkOutButton,
                  !todayRecord?.checkInTime && { opacity: 0.5 },
                ]}
                contentStyle={styles.checkButtonContent}
                icon={() => <LogOut size={18} color="#fff" />}
              >
                {todayRecord?.checkOutTime
                  ? `签退 ${new Date(todayRecord.checkOutTime).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : '下班签退'}
              </Button>
              <Text style={styles.checkButtonLabel}>下班打卡</Text>
            </View>
          </View>

          <View style={styles.scanButtonRow}>
            <TouchableOpacity
              onPress={handleScanPress}
              disabled={scanLoading}
              style={styles.scanButton}
            >
              <QrCode size={20} color="#2563eb" />
              <Text style={styles.scanButtonText}>扫码签到</Text>
            </TouchableOpacity>
          </View>

          {todayRecord && todayRecord.status !== 'normal' && (
            <View style={styles.warningRow}>
              <AlertTriangle size={14} color="#d97706" />
              <Text style={styles.warningText}>
                {todayRecord.status === 'late'
                  ? '今日迟到，请合理安排时间'
                  : todayRecord.status === 'early_leave'
                    ? '今日早退，请确认工作完成'
                    : ''}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.statsCard} mode="elevated">
        <Card.Content>
          <View style={styles.cardTitleRow}>
            <TrendingUp size={18} color="#2563eb" />
            <Title style={styles.cardTitle}>本月统计</Title>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.attendanceDays || 0}</Text>
              <Text style={styles.statLabel}>出勤天数</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#d97706' }]}>{stats?.lateCount || 0}</Text>
              <Text style={styles.statLabel}>迟到</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#ea580c' }]}>
                {stats?.earlyLeaveCount || 0}
              </Text>
              <Text style={styles.statLabel}>早退</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#dc2626' }]}>
                {stats?.absentCount || 0}
              </Text>
              <Text style={styles.statLabel}>缺勤</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.recordsCard} mode="elevated">
        <Card.Content>
          <View style={styles.cardTitleRow}>
            <Calendar size={18} color="#2563eb" />
            <Title style={styles.cardTitle}>近期记录</Title>
          </View>

          <List.Section style={{ paddingHorizontal: 0, paddingTop: 0 }}>
            {records.map((record) => (
              <View key={record.id}>
                <List.Item
                  title={record.date}
                  description={
                    record.checkInTime
                      ? `上班 ${new Date(record.checkInTime).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })} ${
                          record.checkOutTime
                            ? `| 下班 ${new Date(record.checkOutTime).toLocaleTimeString('zh-CN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : ''
                        }`
                      : '未打卡'
                  }
                  right={() => (
                    <Chip
                      style={{ backgroundColor: getStatusColor(record.status) + '20' }}
                      textStyle={{ fontSize: 10 }}
                    >
                      <Text
                        style={{
                          color: getStatusColor(record.status),
                          fontSize: 11,
                          fontWeight: '600',
                        }}
                      >
                        {getStatusLabel(record.status)}
                      </Text>
                    </Chip>
                  )}
                  style={{ paddingHorizontal: 0, paddingVertical: 4 }}
                />
                <Divider />
              </View>
            ))}
          </List.Section>
        </Card.Content>
      </Card>

      <ScanModal
        visible={scanModalVisible}
        onClose={handleScanClose}
        onScanSuccess={handleScanSuccess}
        scanType="all"
      />
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
    padding: 20,
    paddingBottom: 12,
  },
  dateText: {
    fontSize: 14,
    color: '#6b7280',
  },
  greetingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
  },
  checkInCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  locationText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  currentTime: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 12,
    letterSpacing: 2,
  },
  checkButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  checkButtonContainer: {
    alignItems: 'center',
  },
  checkButton: {
    borderRadius: 12,
    width: 120,
    height: 48,
    justifyContent: 'center',
  },
  checkInButton: {
    backgroundColor: '#16a34a',
  },
  checkOutButton: {
    backgroundColor: '#2563eb',
  },
  checkButtonContent: {
    height: 48,
  },
  checkButtonLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  scanButtonRow: {
    alignItems: 'center',
    marginTop: 16,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  scanButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
    marginLeft: 8,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  warningText: {
    fontSize: 12,
    color: '#d97706',
    marginLeft: 6,
  },
  statsCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  recordsCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
});

export default AttendancePage;
