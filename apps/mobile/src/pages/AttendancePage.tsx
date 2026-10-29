import { designTokens } from '@topems/tokens';
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
import { zh, scanRecognizedContent, scanAllDoneMessage } from '../i18n/zh';

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
        lat: location?.lat || 0,
        lng: location?.lng || 0,
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
        lat: location?.lat || 0,
        lng: location?.lng || 0,
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
          Alert.alert(zh['attendance.checkInScanSuccess'], scanRecognizedContent(data));
        } else if (!todayRecord?.checkOutTime) {
          await handleCheckOut();
          Alert.alert(zh['attendance.checkOutScanSuccess'], scanRecognizedContent(data));
        } else {
          Alert.alert(zh['attendance.scanSuccess'], scanAllDoneMessage(data));
        }
      } else {
        Alert.alert(
          zh['attendance.scanFailed'],
          response.message || zh['attendance.scanServiceError'],
        );
      }
    } catch (error) {
      console.error('Scan failed:', error);
      Alert.alert(zh['attendance.scanFailed'], zh['attendance.serverUnreachable']);
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
        return designTokens.colors.success[600];
      case 'late':
        return designTokens.colors.warning[600];
      case 'early_leave':
        return designTokens.colors.orange[600];
      case 'absent':
        return designTokens.colors.error[600];
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'normal':
        return zh['common.statusNormal'];
      case 'late':
        return zh['attendance.late'];
      case 'early_leave':
        return zh['attendance.earlyLeave'];
      case 'absent':
        return zh['attendance.absent'];
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating size="large" color={designTokens.colors.blue[600]} />
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
        <Text style={styles.greetingText}>{zh['attendance.todayAttendance']}</Text>
      </View>

      <Card style={styles.checkInCard} mode="elevated">
        <Card.Content>
          <View style={styles.locationRow}>
            <MapPin size={14} color={designTokens.colors.blue[600]} />
            <Text style={styles.locationText}>{zh['attendance.locationLocated']}</Text>
          </View>

          <View style={styles.timeDisplay}>
            <Clock size={48} color={designTokens.colors.blue[600]} />
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
                icon={() => <LogIn size={18} color={designTokens.colors.common.white} />}
              >
                {todayRecord?.checkInTime
                  ? `${zh['attendance.checkInTimePrefix']}${new Date(
                      todayRecord.checkInTime,
                    ).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : zh['attendance.checkIn']}
              </Button>
              <Text style={styles.checkButtonLabel}>{zh['attendance.checkInButton']}</Text>
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
                icon={() => <LogOut size={18} color={designTokens.colors.common.white} />}
              >
                {todayRecord?.checkOutTime
                  ? `${zh['attendance.checkOutTimePrefix']}${new Date(
                      todayRecord.checkOutTime,
                    ).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : zh['attendance.checkOut']}
              </Button>
              <Text style={styles.checkButtonLabel}>{zh['attendance.checkOutButton']}</Text>
            </View>
          </View>

          <View style={styles.scanButtonRow}>
            <TouchableOpacity
              onPress={handleScanPress}
              disabled={scanLoading}
              style={styles.scanButton}
            >
              <QrCode size={20} color={designTokens.colors.blue[600]} />
              <Text style={styles.scanButtonText}>{zh['attendance.scanCheckIn']}</Text>
            </TouchableOpacity>
          </View>

          {todayRecord && todayRecord.status !== 'normal' && (
            <View style={styles.warningRow}>
              <AlertTriangle size={14} color={designTokens.colors.warning[600]} />
              <Text style={styles.warningText}>
                {todayRecord.status === 'late'
                  ? zh['attendance.lateWarning']
                  : todayRecord.status === 'early_leave'
                    ? zh['attendance.earlyLeaveWarning']
                    : ''}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.statsCard} mode="elevated">
        <Card.Content>
          <View style={styles.cardTitleRow}>
            <TrendingUp size={18} color={designTokens.colors.blue[600]} />
            <Title style={styles.cardTitle}>{zh['attendance.monthlyStats']}</Title>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.attendanceDays || 0}</Text>
              <Text style={styles.statLabel}>{zh['attendance.attendanceDays']}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: designTokens.colors.warning[600] }]}>
                {stats?.lateCount || 0}
              </Text>
              <Text style={styles.statLabel}>{zh['attendance.late']}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: designTokens.colors.orange[600] }]}>
                {stats?.earlyLeaveCount || 0}
              </Text>
              <Text style={styles.statLabel}>{zh['attendance.earlyLeave']}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: designTokens.colors.error[600] }]}>
                {stats?.absentCount || 0}
              </Text>
              <Text style={styles.statLabel}>{zh['attendance.absent']}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.recordsCard} mode="elevated">
        <Card.Content>
          <View style={styles.cardTitleRow}>
            <Calendar size={18} color={designTokens.colors.blue[600]} />
            <Title style={styles.cardTitle}>{zh['attendance.recentRecords']}</Title>
          </View>

          <List.Section style={{ paddingHorizontal: 0, paddingTop: 0 }}>
            {records.map((record) => (
              <View key={record.id}>
                <List.Item
                  title={record.date}
                  description={
                    record.checkInTime
                      ? `${zh['attendance.recordCheckInPrefix']}${new Date(
                          record.checkInTime,
                        ).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })} ${
                          record.checkOutTime
                            ? `${zh['attendance.recordCheckOutPrefix']}${new Date(
                                record.checkOutTime,
                              ).toLocaleTimeString('zh-CN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : ''
                        }`
                      : zh['attendance.noCheckIn']
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
    backgroundColor: designTokens.colors.success[600],
  },
  checkOutButton: {
    backgroundColor: designTokens.colors.blue[600],
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
    backgroundColor: designTokens.colors.blue[50],
    borderRadius: 24,
    borderWidth: 1,
    borderColor: designTokens.colors.blue[200],
  },
  scanButtonText: {
    fontSize: 14,
    color: designTokens.colors.blue[600],
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
    color: designTokens.colors.warning[600],
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
    color: designTokens.colors.success[600],
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
